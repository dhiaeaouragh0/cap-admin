// src/pages/Products/ProductCreate.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface VariantImage {
  file: File;
  preview: string;
}

interface Variant {
  name: string;
  sku: string;
  price: number;
  stock: number;
  isDefault: boolean;
  images: VariantImage[];
  uploadedImageUrls: string[];
}

interface Spec {
  key: string;
  value: string;
}

export default function ProductCreate() {
  const navigate = useNavigate();

  const [name, setName]                 = useState('');
  const [slug, setSlug]                 = useState('');
  const [description, setDescription]   = useState('');
  const [brand, setBrand]               = useState('');
  const [isFeatured, setIsFeatured]     = useState(false);

  const [variants, setVariants]         = useState<Variant[]>([]);
  const [specs, setSpecs]               = useState<Spec[]>([]);

  const [uploading, setUploading]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  // Toujours au moins une variante au démarrage
  useEffect(() => {
    if (variants.length === 0) {
      addVariant(true); // true = première → isDefault
    }
  }, []);

  // Slug auto
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

  const defaultVariant = variants.find(v => v.isDefault) || variants[0];
  const calculatedBasePrice = defaultVariant?.price ?? 0;

  const addVariant = (isFirst = false) => {
    const newVariant: Variant = {
      name: '',
      sku: '',
      price: 0,
      stock: 0,
      isDefault: isFirst || variants.length === 0,
      images: [],
      uploadedImageUrls: [],
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) {
      toast.error("Il faut au moins une variante");
      return;
    }

    const removingDefault = variants[index].isDefault;
    let next = variants.filter((_, i) => i !== index);

    if (removingDefault) {
      next = next.map((v, i) => i === 0 ? { ...v, isDefault: true } : v);
    }

    setVariants(next);
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    setVariants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleVariantImageChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    const variant = variants[idx];

    if (variant.images.length + newFiles.length > 5) {
      toast.error('Maximum 5 images par variante');
      return;
    }

    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setVariants(prev => {
      const copy = [...prev];
      copy[idx].images.push(...newFiles.map((f, i) => ({
        file: f,
        preview: newPreviews[i],
      })));
      return copy;
    });
  };

  const removeVariantImage = (vIdx: number, imgIdx: number) => {
    setVariants(prev => {
      const copy = [...prev];
      copy[vIdx].images = copy[vIdx].images.filter((_, i) => i !== imgIdx);
      copy[vIdx].uploadedImageUrls = copy[vIdx].uploadedImageUrls.filter((_, i) => i !== imgIdx);
      return copy;
    });
  };

  const uploadVariantImages = async (idx: number): Promise<string[]> => {
    const variant = variants[idx];
    if (variant.images.length === 0) return variant.uploadedImageUrls;

    try {
      const formData = new FormData();
      variant.images.forEach(({ file }) => formData.append('images', file));

      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const urls = res.data.urls ?? [];
      setVariants(prev => {
        const copy = [...prev];
        copy[idx].uploadedImageUrls = [...copy[idx].uploadedImageUrls, ...urls];
        return copy;
      });
      return urls;
    } catch {
      toast.error(`Échec upload images variante ${variant.name || idx + 1}`);
      return [];
    }
  };

  const addSpec = () => setSpecs(prev => [...prev, { key: '', value: '' }]);
  const removeSpec = (idx: number) => setSpecs(prev => prev.filter((_, i) => i !== idx));
  const updateSpec = (idx: number, field: 'key' | 'value', val: string) => {
    setSpecs(prev => {
      const next = [...prev];
      next[idx][field] = val;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      toast.error('Nom et description obligatoires');
      return;
    }

    if (!variants.some(v => v.isDefault)) {
      toast.error('Sélectionnez une variante par défaut');
      return;
    }

    if (!variants.every(v => v.name.trim() && v.sku.trim() && v.price > 0)) {
      toast.error('Chaque variante doit avoir un nom, SKU et prix > 0');
      return;
    }

    setSubmitting(true);

    try {
      // Upload toutes les images variantes
      for (let i = 0; i < variants.length; i++) {
        await uploadVariantImages(i);
      }

      const specsObj: Record<string, string> = {};
      specs.forEach(s => {
        if (s.key.trim() && s.value.trim()) specsObj[s.key.trim()] = s.value.trim();
      });

      const cleanVariants = variants.map(v => ({
        name: v.name.trim(),
        sku: v.sku.trim(),
        price: Number(v.price),
        stock: Number(v.stock),
        images: v.uploadedImageUrls,
        isDefault: v.isDefault,
      }));

      const payload = {
        name: name.trim(),
        slug,
        description: description.trim(),
        brand: brand.trim() || undefined,
        images: [], // plus utilisé → on envoie vide
        variants: cleanVariants,
        basePrice: calculatedBasePrice,
        isFeatured,
        ...(Object.keys(specsObj).length ? { specs: specsObj } : {}),
      };

      await api.post('/products', payload);

      toast.success('Produit créé !');
      navigate('/products');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur création');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Ajouter un produit</h1>
        <Button variant="outline" onClick={() => navigate('/products')}>Retour</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader><CardTitle>Informations principales</CardTitle></CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Slug (auto)</Label>
              <Input value={slug} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Marque</Label>
              <Input value={brand} onChange={e => setBrand(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Description *</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} required />
            </div>
            <div className="flex items-center space-x-2 pt-4">
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              <Label>Produit mis en avant</Label>
            </div>
          </CardContent>
        </Card>

        {/* Variantes – toujours présentes */}
        <Card>
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Variantes (obligatoires – au moins 1)</CardTitle>
            <Button type="button" variant="outline" onClick={() => addVariant()}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter variante
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-10">
              {variants.map((v, idx) => (
                <div key={idx} className="relative border rounded-lg p-5 bg-muted/30">
                  {variants.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 text-red-600"
                      onClick={() => removeVariant(idx)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}

                  <div className="grid gap-4 md:grid-cols-5 mb-6">
                    <div>
                      <Label>Nom *</Label>
                      <Input value={v.name} onChange={e => updateVariant(idx, 'name', e.target.value)} />
                    </div>
                    <div>
                      <Label>SKU *</Label>
                      <Input value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} />
                    </div>
                    <div>
                      <Label>Prix (DA) *</Label>
                      <Input
                        type="number"
                        min={1}
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
                    <Label>Images de cette variante (max 5)</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`upload-${idx}`)?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" /> Ajouter
                      </Button>
                      <input
                        id={`upload-${idx}`}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => handleVariantImageChange(e, idx)}
                      />
                    </div>

                    {v.images.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                        {v.images.map((img, i) => (
                          <div key={i} className="relative group">
                            <img src={img.preview} alt="" className="h-24 w-full object-cover rounded border" />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={() => removeVariantImage(idx, i)}
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
          </CardContent>
        </Card>

        {/* Specs */}
        <Card>
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>Caractéristiques (optionnel)</CardTitle>
            <Button type="button" variant="outline" onClick={addSpec}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            {specs.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">Ex : Couleur, Taille, Matériau...</p>
            ) : (
              <div className="space-y-5">
                {specs.map((s, i) => (
                  <div key={i} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label>Clé</Label>
                      <Input value={s.key} onChange={e => updateSpec(i, 'key', e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <Label>Valeur</Label>
                      <Input value={s.value} onChange={e => updateSpec(i, 'value', e.target.value)} />
                    </div>
                    <Button variant="ghost" size="icon" className="mb-2 text-red-600" onClick={() => removeSpec(i)}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pt-8">
          <Button type="button" variant="outline" onClick={() => navigate('/products')} disabled={submitting || uploading}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting || uploading}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création…
              </>
            ) : 'Créer produit'}
          </Button>
        </div>
      </form>
    </div>
  );
}