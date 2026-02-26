// src/pages/Orders/OrderList.tsx
import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Eye, CheckCircle2, Truck, PackageCheck, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ──────────────────────────────────────────────── Types
interface ProductPopulated {
  _id: string;
  name: string;
  slug: string;
}

interface Order {
  _id: string;
  product: ProductPopulated;
  variantName?: string | null;
  variantSku?: string | null;           // ← AJOUTÉ
  quantity: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  wilaya: string;
  deliveryType: 'domicile' | 'agence';
  address: string;
  note?: string;
  unitPrice: number;
  shippingFee: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: 'En attente',   color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
  confirmed: { label: 'Confirmée',    color: 'bg-blue-100 text-blue-800 border-blue-300',   icon: CheckCircle2 },
  shipped:   { label: 'Expédiée',     color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Truck },
  delivered: { label: 'Livrée',       color: 'bg-green-100 text-green-800 border-green-300',  icon: PackageCheck },
  cancelled: { label: 'Annulée',      color: 'bg-red-100 text-red-800 border-red-300',     icon: XCircle },
};

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit: 20,
        sort: '-createdAt',
      };

      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/orders', { params });
      setOrders(res.data.orders || res.data || []);
    } catch (err: any) {
      console.error('Orders fetch error:', err);
      toast.error('Impossible de charger les commandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchTerm]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      await api.put(`/orders/${orderId}/status`, { status: newStatus });

      toast.success('Statut mis à jour');
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, status: newStatus as Order['status'] } : o
        )
      );

      if (selectedOrder?._id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: newStatus as Order['status'] } : null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur mise à jour statut');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { color: 'bg-gray-100', icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Commandes</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="confirmed">Confirmée</SelectItem>
                <SelectItem value="shipped">Expédiée</SelectItem>
                <SelectItem value="delivered">Livrée</SelectItem>
                <SelectItem value="cancelled">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1 min-w-62.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Client, téléphone ou email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0 pt-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {searchTerm || statusFilter !== 'all'
                ? 'Aucune commande ne correspond aux filtres'
                : 'Aucune commande pour le moment'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Wilaya / Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order._id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <TableCell>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.customerPhone}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">
                          {order.product?.name || 'Produit supprimé'}
                        </div>
                        {(order.variantName || order.variantSku) && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {order.variantName && `Variante : ${order.variantName}`}
                            {order.variantName && order.variantSku && ' • '}
                            {order.variantSku && (
                              <>
                                SKU: <span className="font-mono font-medium">{order.variantSku}</span>
                              </>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          × {order.quantity}
                        </div>
                      </TableCell>

                      <TableCell className="font-medium whitespace-nowrap">
                        {order.totalPrice.toLocaleString()} DA
                      </TableCell>

                      <TableCell>
                        <div>{order.wilaya}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.deliveryType === 'domicile' ? 'Domicile' : 'Agence'}
                        </div>
                      </TableCell>

                      <TableCell>
                        {(() => {
                          const status = statusConfig[order.status];
                          if (!status) return null;
                          const Icon = status.icon;
                          return (
                            <span
                              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm font-medium ${status.color}`}
                            >
                              <Icon className="h-4 w-4" />
                              {status.label}
                            </span>
                          );
                        })()}
                      </TableCell>

                      <TableCell>
                        {format(new Date(order.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Commande #{selectedOrder?._id?.slice(-6)}</DialogTitle>
            <DialogDescription>
              {selectedOrder && format(new Date(selectedOrder.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="grid gap-6 py-4">
              {/* Customer Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Client</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <div><strong>Nom :</strong> {selectedOrder.customerName}</div>
                  <div><strong>Téléphone :</strong> {selectedOrder.customerPhone}</div>
                  <div><strong>Email :</strong> {selectedOrder.customerEmail}</div>
                </CardContent>
              </Card>

              {/* Order Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Détails de la commande</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <strong>Produit :</strong><br />
                      {selectedOrder.product?.name || 'Produit supprimé'}
                      {(selectedOrder.variantName || selectedOrder.variantSku) && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {selectedOrder.variantName && (
                            <>Variante : {selectedOrder.variantName}</>
                          )}
                          {selectedOrder.variantName && selectedOrder.variantSku && ' • '}
                          {selectedOrder.variantSku && (
                            <>
                              SKU : <span className="font-mono font-medium">{selectedOrder.variantSku}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <strong>Quantité :</strong> {selectedOrder.quantity}
                      </div>
                      <div>
                        <strong>Prix unitaire :</strong> {selectedOrder.unitPrice.toLocaleString()} DA
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t pt-4">
                    <div>
                      <strong>Livraison :</strong><br />
                      {selectedOrder.wilaya} – {selectedOrder.deliveryType === 'domicile' ? 'À domicile' : 'En agence'}
                    </div>
                    <div>
                      <strong>Frais livraison :</strong> {selectedOrder.shippingFee.toLocaleString()} DA
                      {selectedOrder.shippingFee === 0 && (
                        <span className="text-green-600 text-xs ml-2">(Gratuite)</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <strong>Total à payer :</strong>{' '}
                    <span className="text-xl font-bold">{selectedOrder.totalPrice.toLocaleString()} DA</span>
                  </div>

                  {selectedOrder.note && (
                    <div className="border-t pt-4">
                      <strong>Note du client :</strong><br />
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedOrder.note}</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <strong>Adresse complète :</strong><br />
                    <p className="text-sm mt-1">{selectedOrder.address}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Status */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <strong>Statut actuel :</strong>{' '}
                  {getStatusBadge(selectedOrder.status)}
                </div>

                <Select
                  value={selectedOrder.status}
                  onValueChange={(newStatus) => handleStatusChange(selectedOrder._id, newStatus)}
                  disabled={updatingId === selectedOrder._id}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="confirmed">Confirmée</SelectItem>
                    <SelectItem value="shipped">Expédiée</SelectItem>
                    <SelectItem value="delivered">Livrée</SelectItem>
                    <SelectItem value="cancelled">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}