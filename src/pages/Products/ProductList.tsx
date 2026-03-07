// src/pages/Products/ProductList.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
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
  name: string;
  sku: string;
  priceDifference: number;
  stock: number;
  images: string[];
  isDefault: boolean;
  _id: string;
}



interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  discount: number;
  brand?: string;
  // images: string[];
  variants: Variant[];
  stock?: number;
  specs?: Record<string, string>;
  isFeatured: boolean;
  createdAt: string;
  __v: number;
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

  const limit = 6;

  const fetchProducts = async (page: number = 1) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        limit,
      };

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

  // Debounce avec toutes les dépendances importantes
  const debouncedFetch = useMemo(
    () =>
      debounce((page: number) => {
        fetchProducts(page);
      }, 500),
    [searchTerm, minPrice, maxPrice, inStockOnly] // ← toutes les dépendances ici
  );

  useEffect(() => {
    debouncedFetch(1);
    return () => {
      debouncedFetch.cancel();
    };
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
    // fetchProducts(1) sera déclenché automatiquement via useEffect + debounce
  };

  const getEffectiveStock = (product: Product) => {
    if (product.variants?.length > 0) {
      return product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    }
    return product.stock ?? 0;
  };

  // Pagination numbers (simple & clean)
  const pageNumbers = useMemo(() => {
    if (!pagination) return [];
    const { currentPage: curr, totalPages } = pagination;
    const delta = 2;
    const range: (number | string)[] = [];
    let l: number | null = null;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= curr - delta && i <= curr + delta)) {
        if (l && i - (l as number) > 1) {
          range.push('...');
        }
        range.push(i);
        l = i;
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

      {/* Filtres */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recherche + Stock */}
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom du produit, marque, slug..."
                className="pl-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

          {/* Prix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Prix minimum (DA)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Prix maximum (DA)</label>
              <Input
                type="number"
                min={0}
                placeholder="Aucun"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-10"
              />
            </div>
            <Button
              variant="outline"
              className="h-10 self-end"
              onClick={resetFilters}
              disabled={loading || (!searchTerm && !minPrice && !maxPrice && !inStockOnly)}
            >
              Réinitialiser tous les filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
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
                : 'Aucun produit pour le moment'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Stock total</TableHead>
                      <TableHead>Variantes</TableHead>
                      <TableHead>Mis en avant</TableHead>
                      {role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product._id} className="hover:bg-muted/50">
                        <TableCell>
                          {product.variants?.[0]?.images?.[0] ? (
                            <img
                              src={product.variants[0].images[0]}
                              alt={product.name}
                              className="h-12 w-12 rounded object-cover border"
                              onError={(e) => {
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

                        <TableCell>{product.basePrice.toLocaleString()} DA</TableCell>

                        <TableCell>{getEffectiveStock(product)}</TableCell>

                        <TableCell>{product.variants?.length || '—'}</TableCell>

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
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-4 sm:px-6">
                  <p className="hidden sm:block text-sm text-muted-foreground">
                    Affichage de{' '}
                    <span className="font-medium">
                      {(currentPage - 1) * limit + 1}
                    </span>{' '}
                    à{' '}
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
                          onClick={() => {
                            if (typeof pageNum === 'number') fetchProducts(pageNum);
                          }}
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