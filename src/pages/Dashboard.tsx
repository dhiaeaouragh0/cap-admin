// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowUpRight,
  ShoppingCart,
  DollarSign,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ──────────────────────────────────────────────── Types (basés sur ton ancien code)
interface OrderSummary {
  product: any;
  _id: string;
  customerName: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  wilaya?: string;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  todayOrders: number;
  cancellationRate: number;
  deliveredOrders: number;
  dailyData: { _id: string; orders: number; revenue: number }[];
  revenueByStatus: { _id: string; total: number }[];
  ordersByDelivery: { _id: string; count: number }[];
  topWilayas: { _id: string; count: number }[];
}

// ──────────────────────────────────────────────── Composant Dashboard (ancien contenu + nouveau design)
export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    todayOrders: 0,
    cancellationRate: 0,
    deliveredOrders: 0,
    dailyData: [],
    revenueByStatus: [],
    ordersByDelivery: [],
    topWilayas: [],
  });

  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [summaryRes, ordersRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/orders?limit=6&sort=-createdAt'),
      ]);

      setStats(summaryRes.data || stats);
      setRecentOrders(ordersRes.data.orders || []);
    } catch (err: any) {
      toast.error('Impossible de charger le dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      confirmed:  'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      shipped:    'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      delivered:  'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
      cancelled:  'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700',
    };

    return (
      <Badge variant="outline" className={colors[status] || 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            Aperçu de l'activité de la boutique
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Rafraîchir
        </Button>
      </div>

      {/* Stats Cards – ton ancien layout, mais stylé */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="bg-linear-to-br from-blue-50/80 to-blue-100/80 dark:from-blue-950/60 dark:to-blue-900/60 border-blue-200/50 dark:border-blue-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Commandes</CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold">{stats.totalOrders.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Toutes les commandes</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-yellow-50/80 to-yellow-100/80 dark:from-yellow-950/60 dark:to-yellow-900/60 border-yellow-200/50 dark:border-yellow-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commandes en attente</CardTitle>
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold text-yellow-700 dark:text-yellow-300">
                {stats.pendingOrders}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">À traiter</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-green-50/80 to-green-100/80 dark:from-green-950/60 dark:to-green-900/60 border-green-200/50 dark:border-green-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires total</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-28" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold">
                {stats.totalRevenue.toLocaleString()} DA
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Somme de toutes les commandes</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-purple-50/80 to-purple-100/80 dark:from-purple-950/60 dark:to-purple-900/60 border-purple-200/50 dark:border-purple-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CA ce mois</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-28" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold text-purple-700 dark:text-purple-300">
                {stats.monthlyRevenue.toLocaleString()} DA
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Mois en cours</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-cyan-50/80 to-cyan-100/80 dark:from-cyan-950/60 dark:to-cyan-900/60 border-cyan-200/50 dark:border-cyan-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commandes aujourd'hui</CardTitle>
            <ArrowUpRight className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold">{stats.todayOrders}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Dernières 24 heures</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-red-50/80 to-red-100/80 dark:from-red-950/60 dark:to-red-900/60 border-red-200/50 dark:border-red-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux d'annulation</CardTitle>
            <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold text-red-700 dark:text-red-300">
                {stats.cancellationRate?.toFixed(1) || 0} %
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Sur total commandes</p>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Wilayas – gardé mais stylé */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Wilayas</CardTitle>
          <CardDescription>Par nombre de commandes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : stats.topWilayas?.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Pas de données</p>
          ) : (
            <ul className="space-y-3">
              {stats.topWilayas.map((w) => (
                <li key={w._id} className="flex justify-between items-center py-1">
                  <span className="font-medium">{w._id}</span>
                  <Badge variant="secondary" className="text-sm">
                    {w.count} ({((w.count / stats.totalOrders) * 100).toFixed(1)}%)
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Graphique – gardé tel quel mais stylé */}
      <Card>
        <CardHeader>
          <CardTitle>Commandes & CA – 30 derniers jours</CardTitle>
          <CardDescription>Tendances quotidiennes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : stats.dailyData?.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Pas de données sur 30 jours
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="_id"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    stroke="#888"
                  />
                  <YAxis yAxisId="left" stroke="#888" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                    }}
                    formatter={(value, name) =>
                      name === 'revenue'
                        ? `${Number(value).toLocaleString()} DA`
                        : value
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#8884d8" name="Commandes" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" name="CA (DA)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commandes récentes – gardé tel quel mais stylé */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Commandes récentes</CardTitle>
            <CardDescription>Dernières 6 commandes</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/orders">Voir toutes les commandes</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune commande récente
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow
                      key={order._id}
                      className="cursor-pointer hover:bg-muted/60 transition-colors"
                      onClick={() => navigate(`/orders`)}
                    >
                      <TableCell className="font-medium">
                        {order.customerName}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {order.wilaya || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {/* Si tu as product.name dans les données */}
                        {order.product?.name || '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.totalPrice.toLocaleString()} DA
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString('fr-DZ', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}