// src/pages/Products/ProductEdit.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';

// ──────────────────────────────────────────────── Types

interface ImageItem {
  file?: File;       // new local file to upload
  preview: string;   // always present (local preview or server URL)
  url?: string;      // server URL (existing images)
}

interface Variant {
  _id?: string;              // present for existing variants
  name: string;
  sku: string;
  price: number;             // ← absolute price (fixed)
  stock: number;
  isDefault: boolean;
  images: ImageItem[];
}

interface Spec {
  key: string;
  value: string;
}

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName]                 = useState('');
  const [slug, setSlug]                 = useState('');
  const [description, setDescription]   = useState('');
  const [brand, setBrand]               = useState('');
  const [isFeatured, setIsFeatured]     = useState(false);

  const [variants, setVariants]         = useState<Variant[]>([]);
  const [specs, setSpecs]               = useState<Spec[]>([]);

  const [globalImages, setGlobalImages] = useState<ImageItem[]>([]);
  const [globalStock, setGlobalStock]   = useState<number | ''>('');

  const [loadingProduct, setLoadingProduct] = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  // Auto slug
  useEffect(() => {
    if (!name.trim()) {
      setSlug('');
      return;
    }
    const generated = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
  }, [name]);

  // Fetch product data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const res = await api.get(`/products/${id}`);
        const p = res.data;

        setName(p.name || '');
        setSlug(p.slug || '');
        setDescription(p.description || '');
        setBrand(p.brand || '');
        setIsFeatured(!!p.isFeatured);

        // Global images
        setGlobalImages(
          (p.images || []).map((url: string) => ({
            url,
            preview: url,
          }))
        );

        setGlobalStock(p.stock ?? '');

        // Variants – convert priceDifference → price if needed (migration safety)
        const loadedVariants: Variant[] = (p.variants || []).map((v: any) => ({
          _id: v._id,
          name: v.name || '',
          sku: v.sku || '',
          price: v.price ?? (v.priceDifference ?? 0), // ← prefer price if exists
          stock: v.stock || 0,
          isDefault: !!v.isDefault,
          images: (v.images || []).map((url: string) => ({
            url,
            preview: url,
          })),
        }));

        // Ensure at least one default
        if (loadedVariants.length > 0 && !loadedVariants.some(v => v.isDefault)) {
          loadedVariants[0].isDefault = true;
        }

        setVariants(loadedVariants);

        // Specs
        const specsList: Spec[] = [];
        if (p.specs && typeof p.specs === 'object' && !Array.isArray(p.specs)) {
          Object.entries(p.specs).forEach(([k, val]) => {
            if (typeof val === 'string') specsList.push({ key: k, value: val });
          });
        }
        setSpecs(specsList);
      } catch (err: any) {
        toast.error('Impossible de charger le produit');
        console.error(err);
      } finally {
        setLoadingProduct(false);
      }
    };

    fetchData();
  }, [id]);

  // Computed base price (shown for info)
  const defaultVariant = variants.find(v => v.isDefault) || variants[0];
  const calculatedBasePrice = defaultVariant?.price ?? null;

  // ── Global images ───────────────────────────────────────
  const handleGlobalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newFiles = Array.from(e.target.files);

    if (globalImages.length + newFiles.length > 5) {
      toast.error('Maximum 5 images globales');
      return;
    }

    const newItems = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setGlobalImages(prev => [...prev, ...newItems]);
  };

  const removeGlobalImage = (index: number) => {
    setGlobalImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadGlobalImages = async (): Promise<string[]> => {
    const toUpload = globalImages.filter(img => !!img.file);
    if (!toUpload.length) {
      return globalImages.map(img => img.url!).filter(Boolean) as string[];
    }

    setUploading(true);
    try {
      const formData = new FormData();
      toUpload.forEach(({ file }) => file && formData.append('images', file));

      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newUrls = res.data.urls ?? [];

      const existingUrls = globalImages
        .filter(img => !img.file)
        .map(img => img.url!)
        .filter(Boolean);

      const finalUrls = [...existingUrls, ...newUrls];

      // Update state for consistency
      setGlobalImages(finalUrls.map(url => ({ url, preview: url })));

      return finalUrls;
    } catch (err) {
      toast.error('Échec upload images globales');
      return globalImages.map(img => img.url || '').filter(Boolean);
    } finally {
      setUploading(false);
    }
  };

  // ── Variants ────────────────────────────────────────────
  const addVariant = () => {
    const isFirst = variants.length === 0;
    setVariants(prev => [
      ...prev,
      {
        name: '',
        sku: '',
        price: 0,
        stock: 0,
        isDefault: isFirst,
        images: [],
      },
    ]);
  };

  const removeVariant = (index: number) => {
    const removingDefault = variants[index].isDefault;
    let next = variants.filter((_, i) => i !== index);

    if (removingDefault && next.length > 0) {
      next = next.map((v, i) => (i === 0 ? { ...v, isDefault: true } : v));
    }

    setVariants(next);
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    setVariants(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleVariantImageChange = (e: React.ChangeEvent<HTMLInputElement>, vIdx: number) => {
    if (!e.target.files?.length) return;
    const newFiles = Array.from(e.target.files);

    const current = variants[vIdx];
    if (current.images.length + newFiles.length > 5) {
      toast.error('Maximum 5 images par variante');
      return;
    }

    const newItems = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setVariants(prev => {
      const copy = [...prev];
      copy[vIdx].images.push(...newItems);
      return copy;
    });
  };

  const removeVariantImage = (vIdx: number, imgIdx: number) => {
    setVariants(prev => {
      const copy = [...prev];
      copy[vIdx].images = copy[vIdx].images.filter((_, i) => i !== imgIdx);
      return copy;
    });
  };

  const uploadVariantImages = async (vIdx: number): Promise<string[]> => {
    const variant = variants[vIdx];
    const toUpload = variant.images.filter(img => !!img.file);

    if (!toUpload.length) {
      return variant.images.map(img => img.url!).filter(Boolean) as string[];
    }

    try {
      const formData = new FormData();
      toUpload.forEach(({ file }) => file && formData.append('images', file));

      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newUrls = res.data.urls ?? [];

      const existing = variant.images
        .filter(img => !img.file)
        .map(img => img.url!)
        .filter(Boolean);

      const finalUrls = [...existing, ...newUrls];

      // Update state
      setVariants(prev => {
        const copy = [...prev];
        copy[vIdx].images = finalUrls.map(url => ({ url, preview: url }));
        return copy;
      });

      return finalUrls;
    } catch {
      toast.error(`Échec upload images variante ${variant.name || `#${vIdx + 1}`}`);
      return variant.images.map(img => img.url || '').filter(Boolean);
    }
  };

  // ── Specs ───────────────────────────────────────────────
  const addSpec = () => setSpecs(prev => [...prev, { key: '', value: '' }]);
  const removeSpec = (idx: number) => setSpecs(prev => prev.filter((_, i) => i !== idx));
  const updateSpec = (idx: number, field: 'key' | 'value', val: string) => {
    setSpecs(prev => {
      const next = [...prev];
      next[idx][field] = val;
      return next;
    });
  };

  // ── Submit ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasVariants = variants.length > 0;

    // Validation
    if (!name.trim() || !description.trim()) {
      toast.error('Nom et description obligatoires');
      return;
    }

    if (hasVariants) {
      if (!variants.some(v => v.isDefault)) {
        toast.error('Sélectionnez une variante par défaut');
        return;
      }
      if (!variants.every(v => v.name.trim() && v.sku.trim() && v.price >= 0)) {
        toast.error('Chaque variante doit avoir nom, SKU et prix ≥ 0');
        return;
      }
      if (calculatedBasePrice === null || calculatedBasePrice <= 0) {
        toast.error('Prix invalide – vérifiez la variante par défaut');
        return;
      }
    } else {
      if (globalStock === '' || globalStock < 0) {
        toast.error('Stock global requis et ≥ 0');
        return;
      }
      if (globalImages.length === 0) {
        toast.error('Au moins une image globale requise sans variantes');
        return;
      }
    }

    setSubmitting(true);

    try {
      // Uploads
      const finalGlobalUrls = await uploadGlobalImages();

      const variantsWithImages = [...variants];
      for (let i = 0; i < variantsWithImages.length; i++) {
        await uploadVariantImages(i);
      }

      // Specs object
      const specsObj: Record<string, string> = {};
      specs.forEach(s => {
        if (s.key.trim() && s.value.trim()) {
          specsObj[s.key.trim()] = s.value.trim();
        }
      });

      // Clean variants for API
      const cleanVariants = variantsWithImages.map(v => ({
        _id: v._id, // crucial for update
        name: v.name.trim(),
        sku: v.sku.trim(),
        price: Number(v.price),
        stock: Number(v.stock),
        images: v.images.map(img => img.url).filter(Boolean) as string[],
        isDefault: v.isDefault,
      }));

      // Payload
      const payload: any = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        brand: brand.trim() || undefined,
        images: finalGlobalUrls,
        isFeatured,
        ...(Object.keys(specsObj).length ? { specs: specsObj } : {}),
      };

      if (hasVariants) {
        payload.variants = cleanVariants;
        payload.basePrice = calculatedBasePrice!;
        payload.stock = undefined;
      } else {
        payload.stock = Number(globalStock);
        payload.basePrice = 0; // or omit if backend allows
        payload.variants = undefined;
      }

      await api.put(`/products/${id}`, payload);

      toast.success('Produit mis à jour avec succès !');
      navigate('/products');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Modifier le produit</h1>
        <Button variant="outline" onClick={() => navigate('/products')}>
          Retour
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Main info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations principales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Slug (auto)</Label>
              <Input value={slug} readOnly className="bg-muted cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <Label>Marque</Label>
              <Input value={brand} onChange={e => setBrand(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                required
              />
            </div>
            <div className="flex items-center space-x-2 pt-4">
              <Switch
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
                id="featured"
              />
              <Label htmlFor="featured">Mettre en avant</Label>
            </div>
          </CardContent>
        </Card>

        {/* Global images */}
        <Card>
          <CardHeader>
            <CardTitle>
              {variants.length === 0 ? 'Images du produit *' : 'Images globales (optionnel)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('global-upload')?.click()}
                  disabled={uploading || globalImages.length >= 5 || submitting}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {uploading ? 'En cours...' : 'Ajouter images'}
                </Button>
                <input
                  id="global-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleGlobalImageChange}
                />
                <span className="text-sm text-muted-foreground">
                  {globalImages.length} / 5
                </span>
              </div>

              {globalImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {globalImages.map((img, i) => (
                    <div key={i} className="relative group rounded overflow-hidden border">
                      <img src={img.preview} alt="" className="h-32 w-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => removeGlobalImage(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Variants */}
        <Card>
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Variantes (optionnel)</CardTitle>
            <Button type="button" variant="outline" onClick={addVariant}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter variante
            </Button>
          </CardHeader>
          <CardContent>
            {variants.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Pas de variantes → produit simple avec images & stock globaux
              </p>
            ) : (
              <div className="space-y-10">
                {variants.map((v, idx) => (
                  <div key={idx} className="relative border rounded-lg p-5 bg-muted/30">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 text-red-600"
                      onClick={() => removeVariant(idx)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>

                    <div className="grid gap-4 md:grid-cols-5 mb-6">
                      <div>
                        <Label>Nom *</Label>
                        <Input
                          value={v.name}
                          onChange={e => updateVariant(idx, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>SKU *</Label>
                        <Input
                          value={v.sku}
                          onChange={e => updateVariant(idx, 'sku', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Prix (DA) *</Label>
                        <Input
                          type="number"
                          min={0}
                          value={v.price}
                          onChange={e => updateVariant(idx, 'price', Number(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          min={0}
                          value={v.stock}
                          onChange={e => updateVariant(idx, 'stock', Number(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={v.isDefault}
                            onChange={e => updateVariant(idx, 'isDefault', e.target.checked)}
                          />
                          <span className="text-sm">Par défaut</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label>Images variante (max 5)</Label>
                      <div className="mt-2 flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`var-upload-${idx}`)?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" /> Ajouter
                        </Button>
                        <input
                          id={`var-upload-${idx}`}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={e => handleVariantImageChange(e, idx)}
                        />
                      </div>

                      {v.images.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                          {v.images.map((img, imgI) => (
                            <div key={imgI} className="relative group">
                              <img
                                src={img.preview}
                                alt=""
                                className="h-24 w-full object-cover rounded border"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={() => removeVariantImage(idx, imgI)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global stock – only when no variants */}
        {!variants.length && (
          <Card>
            <CardHeader>
              <CardTitle>Stock global *</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm space-y-2">
                <Input
                  type="number"
                  min={0}
                  value={globalStock}
                  onChange={e => setGlobalStock(e.target.value ? Number(e.target.value) : '')}
                  placeholder="ex: 42"
                />
                <p className="text-sm text-muted-foreground">
                  Quantité totale disponible.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Specs */}
        <Card>
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Caractéristiques</CardTitle>
            <Button type="button" variant="outline" onClick={addSpec}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            {specs.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">
                Ex : Matériau → Coton bio, Poids → 180 g…
              </p>
            ) : (
              <div className="space-y-5">
                {specs.map((s, i) => (
                  <div key={i} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label>Clé</Label>
                      <Input
                        value={s.key}
                        onChange={e => updateSpec(i, 'key', e.target.value)}
                        placeholder="ex: Taille"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Valeur</Label>
                      <Input
                        value={s.value}
                        onChange={e => updateSpec(i, 'value', e.target.value)}
                        placeholder="ex: 58 cm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mb-2 text-red-600"
                      onClick={() => removeSpec(i)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
            disabled={submitting || uploading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={submitting || uploading}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              'Enregistrer modifications'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}