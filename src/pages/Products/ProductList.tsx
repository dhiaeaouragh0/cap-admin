// src/pages/Products/ProductList.tsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import debounce from 'lodash.debounce';

// ──────────────────────────────────────────────── Types

interface Variant {
  _id?: string;
  sku: string;
  price: number;
  stock: number;
  images: string[];
  isDefault: boolean;
  attributes: Record<string, string>; // color: "Noir", size: "M", ...
}

interface OptionType {
  name: string;
  displayName: string;
  values: string[];
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  basePrice: number;
  brand?: string;
  variants: Variant[];
  optionTypes: OptionType[];     // ← new field
  isFeatured: boolean;
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  const navigate = useNavigate();
  const role = localStorage.getItem('userRole') || 'confirmateur';

  const limit = 10; // ← increased a bit for better UX

  const fetchProducts = async (page: number = 1) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page, limit };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (minPrice && !isNaN(Number(minPrice))) params.minPrice = Number(minPrice);
      if (maxPrice && !isNaN(Number(maxPrice))) params.maxPrice = Number(maxPrice);
      if (inStockOnly) params.inStock = 'true';

      const res = await api.get('/products', { params });

      setProducts(res.data.products || []);
      setPagination(res.data.pagination || null);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Fetch error:', err);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useMemo(
    () => debounce((page: number) => fetchProducts(page), 500),
    [searchTerm, minPrice, maxPrice, inStockOnly]
  );

  useEffect(() => {
    debouncedFetch(1);
    return () => debouncedFetch.cancel();
  }, [debouncedFetch]);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await api.delete(`/products/${id}`);
      toast.success('Produit supprimé');
      fetchProducts(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Échec de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
  };

  // Get default variant (or first one)
  const getDefaultVariant = (product: Product) =>
    product.variants.find(v => v.isDefault) || product.variants[0];

  // Total stock across all variants
  const getTotalStock = (product: Product) =>
    product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);

  // Number of unique combinations
  const getVariantCount = (product: Product) => product.variants.length;

  // Small preview of options (e.g. "3 couleurs • 4 tailles")
  const getOptionsSummary = (product: Product) => {
    if (!product.optionTypes?.length) return '—';
    return product.optionTypes
      .map(ot => `${ot.values.length} ${ot.displayName.toLowerCase()}`)
      .join(' • ');
  };

  const pageNumbers = useMemo(() => {
    if (!pagination) return [];
    const { currentPage: curr, totalPages } = pagination;
    const delta = 2;
    const range: (number | string)[] = [];
    let last: number | null = null;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= curr - delta && i <= curr + delta)) {
        if (last && i - last > 1) range.push('...');
        range.push(i);
        last = i;
      }
    }
    return range;
  }, [pagination]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
        {role === 'admin' && (
          <Button onClick={() => navigate('/products/new')}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau produit
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom, marque, slug, SKU..."
                className="pl-10 h-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="inStockOnly"
                checked={inStockOnly}
                onCheckedChange={setInStockOnly}
              />
              <label htmlFor="inStockOnly" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                En stock uniquement
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Prix min (DA)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Prix max (DA)</label>
              <Input
                type="number"
                min={0}
                placeholder="Aucun"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="h-10"
              />
            </div>
            <Button
              variant="outline"
              className="h-10 self-end"
              onClick={resetFilters}
              disabled={loading}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 pt-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {searchTerm || minPrice || maxPrice || inStockOnly
                ? 'Aucun produit ne correspond aux filtres'
                : 'Aucun produit trouvé'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Image</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Prix de base</TableHead>
                      <TableHead>Stock total</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead>Variantes</TableHead>
                      <TableHead>Mis en avant</TableHead>
                      {role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => {
                      const defVariant = getDefaultVariant(product);
                      const firstImage = defVariant?.images?.[0];

                      return (
                        <TableRow key={product._id} className="hover:bg-muted/50">
                          <TableCell>
                            {firstImage ? (
                              <img
                                src={firstImage}
                                alt={product.name}
                                className="h-12 w-12 rounded object-cover border"
                                onError={e => {
                                  (e.currentTarget as HTMLImageElement).src = '/api/placeholder/48/48';
                                }}
                              />
                            ) : (
                              <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                Pas d'image
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="font-medium">
                            {product.name}
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {product.brand || '—'} • /{product.slug}
                            </div>
                          </TableCell>

                          <TableCell>
                            {product.basePrice.toLocaleString()} DA
                          </TableCell>

                          <TableCell>
                            {getTotalStock(product) > 0 ? (
                              <span className="font-medium">{getTotalStock(product)}</span>
                            ) : (
                              <span className="text-destructive">Rupture</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {getOptionsSummary(product)}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline">
                              {getVariantCount(product)}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            {product.isFeatured ? (
                              <Badge variant="default">Oui</Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>

                          {role === 'admin' && (
                            <TableCell className="text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/products/edit/${product._id}`)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive/90"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Voulez-vous vraiment supprimer « {product.name} » ? Cette action est irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive hover:bg-destructive/90"
                                      onClick={() => handleDelete(product._id)}
                                      disabled={deletingId === product._id}
                                    >
                                      {deletingId === product._id ? 'Suppression...' : 'Supprimer'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-4 sm:px-6">
                  <p className="hidden sm:block text-sm text-muted-foreground">
                    Affichage de <span className="font-medium">{(currentPage - 1) * limit + 1}</span> à{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * limit, pagination.totalProducts)}
                    </span>{' '}
                    sur <span className="font-medium">{pagination.totalProducts}</span> produits
                  </p>

                  <div className="flex items-center space-x-2 mx-auto sm:mx-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchProducts(currentPage - 1)}
                      disabled={!pagination.hasPrevPage || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>

                    <div className="flex space-x-1">
                      {pageNumbers.map((pageNum, idx) => (
                        <Button
                          key={idx}
                          variant={pageNum === currentPage ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            pageNum === '...' && 'cursor-default hover:bg-transparent border-none'
                          )}
                          disabled={pageNum === '...' || loading}
                          onClick={() => typeof pageNum === 'number' && fetchProducts(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchProducts(currentPage + 1)}
                      disabled={!pagination.hasNextPage || loading}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}