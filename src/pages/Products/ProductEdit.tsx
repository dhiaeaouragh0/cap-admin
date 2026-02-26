// src/pages/Products/ProductEdit.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

interface VariantImage {
  file?: File;              // seulement pour les nouvelles images (preview)
  preview: string;          // URL de preview (locale ou déjà uploadée)
  isNew?: boolean;          // marque les images nouvellement ajoutées
}

interface Variant {
  _id?: string;             // présent si variante existante
  name: string;
  sku: string;
  price: number;
  stock: number;
  isDefault: boolean;
  images: VariantImage[];           // mix : anciennes (URL) + nouvelles (File + preview)
  uploadedImageUrls: string[];      // URLs finales à envoyer au backend
}

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Form states ────────────────────────────────────────
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const [variants, setVariants] = useState<Variant[]>([]);

  // Générer slug en temps réel (mais on le charge aussi depuis le backend)
  useEffect(() => {
    if (name.trim() && !slug) { // on ne régénère que si vide
      const generated = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
      setSlug(generated);
    }
  }, [name, slug]);

  // ── Charger le produit ─────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/products/${id}`);
        const product = res.data;

        setName(product.name || '');
        setSlug(product.slug || '');
        setDescription(product.description || '');
        setBrand(product.brand || '');
        setIsFeatured(product.isFeatured || false);

        // Préparer les variantes
        const loadedVariants = (product.variants || []).map((v: any) => ({
          _id: v._id,
          name: v.name || '',
          sku: v.sku || '',
          price: v.price || 0,
          stock: v.stock || 0,
          isDefault: v.isDefault || false,
          images: (v.images || []).map((url: string) => ({
            preview: url,
            isNew: false,
          })),
          uploadedImageUrls: [...(v.images || [])], // déjà uploadées
        }));

        // S'il n'y a pas de variantes (cas legacy), on en crée une par défaut
        if (loadedVariants.length === 0) {
          loadedVariants.push({
            name: '',
            sku: '',
            price: 0,
            stock: 0,
            isDefault: true,
            images: [],
            uploadedImageUrls: [],
          });
        }

        setVariants(loadedVariants);
      } catch (err: any) {
        toast.error('Impossible de charger le produit');
        console.error(err);
        navigate('/products');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  // ── Gestion des variantes ──────────────────────────────
  const addVariant = () => {
    setVariants([
      ...variants,
      {
        name: '',
        sku: '',
        price: 0,
        stock: 0,
        isDefault: false,
        images: [],
        uploadedImageUrls: [],
      },
    ]);
  };

  const removeVariant = (index: number) => {
    if (variants.length === 1) {
      toast.error('Au moins une variante est obligatoire');
      return;
    }

    setVariants((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (!updated.some((v) => v.isDefault)) {
        updated[0].isDefault = true;
      }
      return updated;
    });
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const updated = [...variants];

    if (field === 'isDefault' && value === true) {
      updated.forEach((v, i) => (v.isDefault = i === index));
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    setVariants(updated);
  };

  const handleVariantImageChange = (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    const variant = variants[variantIndex];

    if (variant.images.length + newFiles.length > 5) {
      toast.error('Maximum 5 images par variante');
      return;
    }

    const newPreviews = newFiles.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      isNew: true,
    }));

    setVariants((prev) => {
      const updated = [...prev];
      updated[variantIndex].images.push(...newPreviews);
      return updated;
    });
  };

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    setVariants((prev) => {
      const updated = [...prev];
      const variant = updated[variantIndex];

      // Supprimer l'image locale / preview
      variant.images = variant.images.filter((_, i) => i !== imageIndex);

      // Si c'était une ancienne image → on la retire aussi des URLs à envoyer
      if (!variant.images[imageIndex]?.isNew) {
        variant.uploadedImageUrls = variant.uploadedImageUrls.filter(
          (_, i) => i !== imageIndex
        );
      }

      return updated;
    });
  };

  const uploadNewVariantImages = async (variantIndex: number): Promise<string[]> => {
    const variant = variants[variantIndex];
    const newImages = variant.images.filter((img) => img.isNew && img.file);

    if (newImages.length === 0) return [];

    try {
      const formData = new FormData();
      newImages.forEach(({ file }) => file && formData.append('images', file));

      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return res.data.urls || [];
    } catch (err: any) {
      toast.error(`Erreur upload images pour ${variant.name || 'une variante'}`);
      return [];
    }
  };

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      toast.error('Champs obligatoires manquants');
      return;
    }

    if (!variants.some((v) => v.isDefault)) {
      variants[0].isDefault = true;
    }

    setSubmitting(true);

    try {
      // 1. Upload des **nouvelles** images pour chaque variante
      const variantsCopy = [...variants];

      for (let i = 0; i < variantsCopy.length; i++) {
        const newUrls = await uploadNewVariantImages(i);
        // On ajoute les nouvelles URLs aux URLs existantes
        variantsCopy[i].uploadedImageUrls = [
          ...variantsCopy[i].uploadedImageUrls,
          ...newUrls,
        ];
      }

      // 2. Préparer le payload propre
      const cleanVariants = variantsCopy.map((v) => ({
        ...(v._id && { _id: v._id }), // important pour update
        name: v.name.trim(),
        sku: v.sku.trim(),
        price: Number(v.price),
        stock: Number(v.stock),
        images: v.uploadedImageUrls, // seulement les URLs finales
        isDefault: v.isDefault,
      }));

      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        brand: brand.trim() || undefined,
        images: [], // backend gère ou ignore
        variants: cleanVariants,
        isFeatured,
      };

      await api.put(`/products/${id}`, payload);

      toast.success('Produit modifié avec succès !');
      navigate('/products');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la modification');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-10 w-10 animate-spin" />
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
        {/* Informations principales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations principales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="slug-unique-du-produit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marque</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Switch
                id="isFeatured"
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
              />
              <Label htmlFor="isFeatured">Produit mis en avant</Label>
            </div>
          </CardContent>
        </Card>

        {/* Variantes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Variantes</CardTitle>
            <Button type="button" variant="outline" onClick={addVariant}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter variante
            </Button>
          </CardHeader>
          <CardContent>
            {variants.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">
                Aucune variante définie
              </p>
            ) : (
              <div className="space-y-8">
                {variants.map((variant, idx) => (
                  <div key={idx} className="border rounded-lg p-5 relative bg-muted/30">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 text-red-600 hover:text-red-700"
                      onClick={() => removeVariant(idx)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>

                    <div className="grid gap-4 md:grid-cols-5 mb-6">
                      <div>
                        <Label>Nom *</Label>
                        <Input
                          value={variant.name}
                          onChange={(e) => updateVariant(idx, 'name', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>SKU *</Label>
                        <Input
                          value={variant.sku}
                          onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Prix *</Label>
                        <Input
                          type="number"
                          value={variant.price}
                          min={0}
                          onChange={(e) =>
                            updateVariant(idx, 'price', Number(e.target.value) || 0)
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          value={variant.stock}
                          min={0}
                          onChange={(e) =>
                            updateVariant(idx, 'stock', Number(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`default-${idx}`}
                            checked={variant.isDefault}
                            onChange={(e) =>
                              updateVariant(idx, 'isDefault', e.target.checked)
                            }
                          />
                          <Label htmlFor={`default-${idx}`}>Par défaut</Label>
                        </div>
                      </div>
                    </div>

                    {/* Images */}
                    <div className="mt-6">
                      <Label>Images (max 5)</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById(`variant-upload-${idx}`)?.click()
                          }
                        >
                          <Upload className="mr-2 h-4 w-4" /> Ajouter
                        </Button>
                        <input
                          id={`variant-upload-${idx}`}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleVariantImageChange(e, idx)}
                        />
                      </div>

                      {variant.images.length > 0 && (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-4">
                          {variant.images.map((img, imgIdx) => (
                            <div key={imgIdx} className="relative group">
                              <img
                                src={img.preview}
                                alt="Variante"
                                className="h-24 w-full object-cover rounded border"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={() => removeVariantImage(idx, imgIdx)}
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

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-10">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Modification en cours...
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}