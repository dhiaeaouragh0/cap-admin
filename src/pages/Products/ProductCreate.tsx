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

interface OptionType {
  name: string;
  displayName: string;
  values: string[];
}

interface Variant {
  sku: string;
  price: number;
  stock: number;
  isDefault: boolean;
  attributes: Record<string, string>;    // color: "Noir", size: "M", ...
  images: VariantImage[];                // local previews
  uploadedImageUrls: string[];           // final URLs after upload
}

export default function ProductCreate() {
  const navigate = useNavigate();

  // ── Form states ────────────────────────────────────────
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const [optionTypes, setOptionTypes] = useState<OptionType[]>([]);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionDisplayName, setNewOptionDisplayName] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  const [variants, setVariants] = useState<Variant[]>([
    {
      sku: '',
      price: 0,
      stock: 0,
      isDefault: true,
      attributes: {},
      images: [],
      uploadedImageUrls: [],
    },
  ]);

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
  useEffect(() => {
  setVariants(prevVariants => {
    let hasChange = false;

    const newVariants = prevVariants.map((v) => {
      const suggested = generateSKU(v, name, brand);
      if (v.sku !== suggested) {
        hasChange = true;
        return { ...v, sku: suggested };
      }
      return v;
    });

    // Only return new array if something actually changed → avoids unnecessary re-renders
    return hasChange ? newVariants : prevVariants;
  });
}, [name, brand, optionTypes, ...variants.map(v => JSON.stringify(v.attributes))]); // deep dep on attributes

// Helper to generate short code from string (e.g. "Noir" → "NOI", "Large" → "L")
const getShortCode = (str: string, length = 3): string => {
  if (!str) return '';
  return str
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, length);
};

  // Auto-generate SKU suggestion
  const generateSKU = (variant: Variant, productName: string, brand?: string): string => {
    if (!productName.trim()) return '';

    // Base: brand or first letters of product name
    const base = brand?.trim()
      ? getShortCode(brand, 3)
      : getShortCode(productName, 4);

    // Attributes part
    const attrParts = optionTypes
      .map(opt => {
        const val = variant.attributes[opt.name];
        return val ? getShortCode(val, opt.name === 'size' ? 2 : 4) : '';
      })
      .filter(Boolean);

    if (attrParts.length === 0) {
      return `${base}-${getShortCode(productName.split(' ')[0], 4)}`.replace(/-+/g, '-');
    }

    return `${base}-${attrParts.join('-')}`.replace(/-+/g, '-').toUpperCase();
  };
  // ── Option Types Management ────────────────────────────
  const addOptionType = () => {
    if (!newOptionName.trim() || !newOptionDisplayName.trim()) {
      toast.error('Nom et nom affiché requis pour l\'option');
      return;
    }
    if (optionTypes.some(o => o.name.toLowerCase() === newOptionName.trim().toLowerCase())) {
      toast.error('Cette option existe déjà');
      return;
    }

    setOptionTypes([
      ...optionTypes,
      {
        name: newOptionName.trim(),
        displayName: newOptionDisplayName.trim(),
        values: [],
      },
    ]);
    setNewOptionName('');
    setNewOptionDisplayName('');
  };

  const addValueToOption = (optionIndex: number) => {
    if (!newOptionValue.trim()) return;
    const updated = [...optionTypes];
    if (updated[optionIndex].values.includes(newOptionValue.trim())) {
      toast.error('Cette valeur existe déjà');
      return;
    }
    updated[optionIndex].values.push(newOptionValue.trim());
    setOptionTypes(updated);
    setNewOptionValue('');
  };

  const removeValueFromOption = (optionIndex: number, valueIndex: number) => {
    const updated = [...optionTypes];
    updated[optionIndex].values.splice(valueIndex, 1);
    setOptionTypes(updated);
  };

  const removeOptionType = (index: number) => {
    setOptionTypes(prev => prev.filter((_, i) => i !== index));
  };

  // ── Variants ───────────────────────────────────────────
  const addVariant = () => {
    setVariants([
      ...variants,
      {
        sku: '',
        price: 0,
        stock: 0,
        isDefault: false,
        attributes: {},
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
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const variant = variants[variantIndex];
      if (variant.images.length + newFiles.length > 5) {
        toast.error('Maximum 5 images par variante');
        return;
      }

      const newPreviews = newFiles.map(f => URL.createObjectURL(f));
      const updated = [...variants];
      updated[variantIndex].images.push(
        ...newFiles.map((f, i) => ({
          file: f,
          preview: newPreviews[i],
        }))
      );
      setVariants(updated);
    }
  };

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    const updated = [...variants];
    updated[variantIndex].images = updated[variantIndex].images.filter((_, i) => i !== imageIndex);
    updated[variantIndex].uploadedImageUrls = updated[variantIndex].uploadedImageUrls.filter((_, i) => i !== imageIndex);
    setVariants(updated);
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
      const updated = [...variants];
      updated[variantIndex].uploadedImageUrls = [
        ...updated[variantIndex].uploadedImageUrls,
        ...newUrls,
      ];
      setVariants(updated);
      return newUrls;
    } catch (err: any) {
      toast.error(`Erreur upload images pour la variante`);
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

    if (optionTypes.length > 0 && variants.length === 0) {
      toast.error('Au moins une variante requise quand des options sont définies');
      return;
    }

    // Vérifier que chaque variante a toutes les attributes
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
      // Upload images pour toutes les variantes
      const variantsWithImages = [...variants];
      for (let i = 0; i < variantsWithImages.length; i++) {
        await uploadVariantImages(i);
      }

      const cleanVariants = variants.map(v => ({
        sku: v.sku.trim(),
        price: Number(v.price),
        stock: Number(v.stock),
        images: v.uploadedImageUrls,
        attributes: v.attributes,
        isDefault: v.isDefault,
      }));

      const payload = {
        name: name.trim(),
        slug,
        description: description.trim(),
        brand: brand.trim() || undefined,
        images: [], // backend gère ça
        optionTypes: optionTypes.map(ot => ({
          name: ot.name,
          displayName: ot.displayName,
          values: ot.values,
        })),
        variants: cleanVariants,
        isFeatured,
      };

      await api.post('/products', payload);

      toast.success('Produit créé avec succès !');
      navigate('/products');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
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
                onChange={e => setName(e.target.value)}
                placeholder="ex: T-shirt Oversize Premium"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Slug (généré automatiquement)</Label>
              <Input value={slug} readOnly className="bg-muted cursor-not-allowed" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marque</Label>
              <Input
                id="brand"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="ex: Nike, Adidas..."
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Décrivez le produit..."
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

        {/* Gestion des options (color, size, etc.) */}
        <Card>
          <CardHeader>
            <CardTitle>Types d'options (Couleur, Taille, Matière…)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Nom interne (clé)</Label>
                <Input
                  value={newOptionName}
                  onChange={e => setNewOptionName(e.target.value)}
                  placeholder="color, size..."
                />
              </div>
              <div>
                <Label>Nom affiché</Label>
                <Input
                  value={newOptionDisplayName}
                  onChange={e => setNewOptionDisplayName(e.target.value)}
                  placeholder="Couleur, Taille..."
                />
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={addOptionType}>
                  <Plus className="mr-2 h-4 w-4" /> Ajouter option
                </Button>
              </div>
            </div>

            {optionTypes.length > 0 && (
              <div className="space-y-6 mt-6">
                {optionTypes.map((opt, optIdx) => (
                  <div key={optIdx} className="border rounded-lg p-4 relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 text-red-600"
                      onClick={() => removeOptionType(optIdx)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>

                    <div className="font-medium mb-3">
                      {opt.displayName} ({opt.name})
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {opt.values.map((val, valIdx) => (
                        <div
                          key={valIdx}
                          className="bg-secondary px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                        >
                          {val}
                          <button
                            type="button"
                            onClick={() => removeValueFromOption(optIdx, valIdx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={newOptionValue}
                        onChange={e => setNewOptionValue(e.target.value)}
                        placeholder={`Ajouter une valeur pour ${opt.displayName}`}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addValueToOption(optIdx))}
                      />
                      <Button type="button" variant="secondary" onClick={() => addValueToOption(optIdx)}>
                        Ajouter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                Ajoutez au moins une variante
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
  <div className="relative">
    <Input
      value={variant.sku}
      onChange={e => updateVariant(idx, 'sku', e.target.value.toUpperCase())}
      required
      className={variant.sku !== generateSKU(variant, name, brand) ? "border-amber-400" : ""}
    />
      <Button
    type="button"
    variant="ghost"
    size="sm"
    className="absolute right-2 top-1/2 -translate-y-1/2"
    onClick={() => {
      const suggested = generateSKU(variant, name, brand);
      updateVariant(idx, 'sku', suggested);
    }}
  >
    ↻
  </Button>
  </div>
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

        {/* Submit */}
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
                Création...
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