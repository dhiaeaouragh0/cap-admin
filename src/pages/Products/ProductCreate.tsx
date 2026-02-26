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

// ──────────────────────────────────────────────── Types

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
  images: VariantImage[];           // images locales pour preview
  uploadedImageUrls: string[];      // URLs après upload backend
}



export default function ProductCreate() {
  const navigate = useNavigate();

  // ── Form states ────────────────────────────────────────
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([
    {
      name: '',
      sku: '',
      price: 0,
      stock: 0,
      isDefault: true, // ← première variante par défaut
      images: [],
      uploadedImageUrls: [],
    },
  ]);

  // Images globales (produit)

  const [uploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Générer slug en temps réel
  useEffect(() => {
    if (name.trim()) {
      const generated = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
      setSlug(generated);
    } else {
      setSlug('');
    }
  }, [name]);


  // ── Variantes ──────────────────────────────────────────
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

    // Sécurité : s'assurer qu'il reste une variante par défaut
    if (!updated.some(v => v.isDefault)) {
      updated[0].isDefault = true;
    }

    return updated;
  });
};

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const updated = [...variants];

    if (field === 'isDefault' && value === true) {
      // Désactiver toutes les autres
      updated.forEach((v, i) => {
        v.isDefault = i === index;
      });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    setVariants(updated);
  };

  const handleVariantImageChange = (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const variant = variants[variantIndex];
      if (variant.images.length + newFiles.length > 5) {
        toast.error('Maximum 5 images par variante');
        return;
      }

      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      const updatedVariants = [...variants];
      updatedVariants[variantIndex].images.push(...newFiles.map((f, i) => ({
        file: f,
        preview: newPreviews[i],
      })));
      setVariants(updatedVariants);
    }
  };

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    const updatedVariants = [...variants];
    updatedVariants[variantIndex].images = updatedVariants[variantIndex].images.filter((_, i) => i !== imageIndex);
    updatedVariants[variantIndex].uploadedImageUrls = updatedVariants[variantIndex].uploadedImageUrls.filter((_, i) => i !== imageIndex);
    setVariants(updatedVariants);
  };

  const uploadVariantImages = async (variantIndex: number): Promise<string[]> => {
    const variant = variants[variantIndex];
    if (variant.images.length === 0) return variant.uploadedImageUrls;

    try {
      const formData = new FormData();
      variant.images.forEach(({ file }) => formData.append('images', file));

      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newUrls = res.data.urls || [];
      const updatedVariants = [...variants];
      updatedVariants[variantIndex].uploadedImageUrls.push(...newUrls);
      setVariants(updatedVariants);
      return newUrls;
    } catch (err: any) {
      toast.error(`Erreur upload images variante "${variant.name}"`);
      return [];
    }
  };

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim() || !description.trim() ) {
      toast.error('Champs obligatoires manquants');
      return;
    }

    if (!variants.some(v => v.isDefault)) {
      variants[0].isDefault = true;
    }

    if (variants.length === 0) {
      toast.error("Au moins une variante est obligatoire");
      return;
    }

    setSubmitting(true);

    try {

      // Upload images pour chaque variante
      const variantsWithImages = [...variants];
      for (let i = 0; i < variantsWithImages.length; i++) {
        const variantUrls = await uploadVariantImages(i);
        variantsWithImages[i].uploadedImageUrls = [
          ...variantsWithImages[i].uploadedImageUrls,
          ...variantUrls,
        ];
      }


      const cleanVariants = variants.map((v) => ({
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
        images: [], // backend le garde vide
        variants: cleanVariants,
        isFeatured,
      };

      await api.post('/products', payload);

      toast.success('Produit créé avec succès !');
      navigate('/products');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur création produit');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Ajouter un produit</h1>
        <Button variant="outline" onClick={() => navigate('/products')}>
          Retour à la liste
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
                placeholder="ex: Manette DualSense Custom FIFA 25"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Slug (généré automatiquement)</Label>
              <Input
                value={slug}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marque</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="ex: Sony Custom DZ"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le produit en détail..."
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
            <CardTitle>Variantes (optionnel)</CardTitle>
            <Button type="button" variant="outline" onClick={addVariant}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter variante
            </Button>
          </CardHeader>
          <CardContent>
            {variants.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">
                Pas de variantes → le produit utilisera les images globales et le stock global
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
                            required
                            onChange={(e) =>
                              updateVariant(idx, 'price', Number(e.target.value) || 0)
                            }
                          />
                      </div>
                      <div>
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          value={variant.stock}
                          onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value) || 0)}
                          min={0}
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`default-${idx}`}
                            checked={variant.isDefault}
                            onChange={(e) => updateVariant(idx, 'isDefault', e.target.checked)}
                          />
                          <Label htmlFor={`default-${idx}`}>Par défaut</Label>
                        </div>
                      </div>
                    </div>

                    {/* Images spécifiques à la variante */}
                    <div className="mt-6">
                      <Label>Images de cette variante (max 5)</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`variant-upload-${idx}`)?.click()}
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

        {/* Boutons d'action */}
        <div className="flex justify-end gap-4 pt-10">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
            disabled={submitting || uploading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={submitting || uploading }>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              'Créer le produit'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}