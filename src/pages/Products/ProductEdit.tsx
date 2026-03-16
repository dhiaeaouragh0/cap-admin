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
  file?: File;          // only for newly added images
  preview: string;      // preview URL (local or existing)
  isNew?: boolean;      // marks newly added images
}

interface OptionType {
  name: string;
  displayName: string;
  values: string[];
}

interface Variant {
  _id?: string;                   // present for existing variants
  sku: string;
  price: number;
  stock: number;
  isDefault: boolean;
  attributes: Record<string, string>;   // color: "Noir", size: "M", ...
  images: VariantImage[];               // mix: old URLs + new File+preview
  uploadedImageUrls: string[];          // final URLs to send
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

  const [optionTypes, setOptionTypes] = useState<OptionType[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  // ── Load product ───────────────────────────────────────
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

        // Load optionTypes
        setOptionTypes(product.optionTypes || []);

        // Prepare variants
        const loadedVariants = (product.variants || []).map((v: any) => ({
          _id: v._id,
          sku: v.sku || '',
          price: v.price || 0,
          stock: v.stock || 0,
          isDefault: v.isDefault || false,
          attributes: v.attributes || {},           // Map → object in JS
          images: (v.images || []).map((url: string) => ({
            preview: url,
            isNew: false,
          })),
          uploadedImageUrls: [...(v.images || [])],
        }));

        // Fallback if no variants (should not happen with new schema)
        if (loadedVariants.length === 0 && optionTypes.length === 0) {
          loadedVariants.push({
            sku: '',
            price: 0,
            stock: 0,
            isDefault: true,
            attributes: {},
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

  // ── Variant management ─────────────────────────────────
  const addVariant = () => {
    const emptyAttrs = Object.fromEntries(optionTypes.map(o => [o.name, '']));
    setVariants([
      ...variants,
      {
        sku: '',
        price: 0,
        stock: 0,
        isDefault: false,
        attributes: emptyAttrs,
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
    setVariants(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (!updated.some(v => v.isDefault)) {
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

  const updateVariantAttribute = (variantIndex: number, attrName: string, value: string) => {
    const updated = [...variants];
    updated[variantIndex].attributes = {
      ...updated[variantIndex].attributes,
      [attrName]: value,
    };
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

    const newPreviews = newFiles.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      isNew: true,
    }));

    setVariants(prev => {
      const updated = [...prev];
      updated[variantIndex].images.push(...newPreviews);
      return updated;
    });
  };

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    setVariants(prev => {
      const updated = [...prev];
      const variant = updated[variantIndex];

      // Remove from images array
      variant.images = variant.images.filter((_, i) => i !== imageIndex);

      // If it was an old image, also remove from uploadedImageUrls
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
    const newImages = variant.images.filter(img => img.isNew && img.file);

    if (newImages.length === 0) return [];

    try {
      const formData = new FormData();
      newImages.forEach(({ file }) => file && formData.append('images', file));

      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return res.data.urls || [];
    } catch (err: any) {
      toast.error(`Erreur upload images pour une variante`);
      return [];
    }
  };

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      toast.error('Nom et description obligatoires');
      return;
    }

    // Validate all required attributes are filled
    const requiredAttrs = optionTypes.map(o => o.name);
    for (const [i, v] of variants.entries()) {
      for (const attr of requiredAttrs) {
        if (!v.attributes[attr]) {
          toast.error(`Variante ${i + 1} : attribut "${attr}" manquant`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // Upload new images for all variants
      const variantsCopy = [...variants];
      for (let i = 0; i < variantsCopy.length; i++) {
        const newUrls = await uploadNewVariantImages(i);
        variantsCopy[i].uploadedImageUrls = [
          ...variantsCopy[i].uploadedImageUrls,
          ...newUrls,
        ];
      }

      // Prepare clean payload
      const cleanVariants = variantsCopy.map(v => ({
        ...(v._id && { _id: v._id }),
        sku: v.sku.trim(),
        price: Number(v.price),
        stock: Number(v.stock),
        images: v.uploadedImageUrls,
        attributes: v.attributes,
        isDefault: v.isDefault,
      }));

      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        brand: brand.trim() || undefined,
        images: [], // backend ignores or keeps
        optionTypes: optionTypes.map(ot => ({
          name: ot.name,
          displayName: ot.displayName,
          values: ot.values,
        })),
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
        {/* Main info */}
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
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="slug-unique-du-produit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marque</Label>
              <Input
                id="brand"
                value={brand}
                onChange={e => setBrand(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <Switch id="isFeatured" checked={isFeatured} onCheckedChange={setIsFeatured} />
              <Label htmlFor="isFeatured">Produit mis en avant</Label>
            </div>
          </CardContent>
        </Card>

        {/* Variants */}
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

                    <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5 mb-6">
                      {optionTypes.map(opt => (
                        <div key={opt.name}>
                          <Label>{opt.displayName} *</Label>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={variant.attributes[opt.name] || ''}
                            onChange={e => updateVariantAttribute(idx, opt.name, e.target.value)}
                            required
                          >
                            <option value="">Choisir...</option>
                            {opt.values.map(v => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}

                      <div>
                        <Label>SKU *</Label>
                        <Input
                          value={variant.sku}
                          onChange={e => updateVariant(idx, 'sku', e.target.value.toUpperCase())}
                          required
                        />
                      </div>
                      <div>
                        <Label>Prix (DZD) *</Label>
                        <Input
                          type="number"
                          min={0}
                          value={variant.price}
                          onChange={e => updateVariant(idx, 'price', Number(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          min={0}
                          value={variant.stock}
                          onChange={e => updateVariant(idx, 'stock', Number(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`default-${idx}`}
                            checked={variant.isDefault}
                            onChange={e => updateVariant(idx, 'isDefault', e.target.checked)}
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
                          onClick={() => document.getElementById(`variant-upload-${idx}`)?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" /> Ajouter images
                        </Button>
                        <input
                          id={`variant-upload-${idx}`}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={e => handleVariantImageChange(e, idx)}
                        />
                      </div>

                      {variant.images.length > 0 && (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-4">
                          {variant.images.map((img, imgIdx) => (
                            <div key={imgIdx} className="relative group">
                              <img
                                src={img.preview}
                                alt="preview"
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

        {/* Submit buttons */}
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
                Enregistrement...
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