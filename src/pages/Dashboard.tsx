import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpRight, ShoppingCart, DollarSign, Clock, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';

// ──────────────────────────────────────────────── Types
interface OrderSummary {
  _id: string;
  product?: {
    name: string;
    slug: string;
  };
  variantName?: string | null;
  quantity: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  wilaya: string;
  deliveryType: string;
  address: string;
  note?: string;
  productPrice: number;
  shippingFee: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
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

// ──────────────────────────────────────────────── Component
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


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const [summaryRes, ordersRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/orders?limit=8&sort=-createdAt'),
        ]);

        // Stats from /dashboard/summary
        setStats(summaryRes.data);

        // Recent orders from /orders
        const apiOrders = ordersRes.data.orders || [];
        setRecentOrders(apiOrders.slice(0, 6));

      } catch (err: any) {
        console.error('Dashboard fetch error:', err);

        if (err.response?.status === 401) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
        } else if (err.response?.status === 403) {
          toast.error('Accès refusé. Réservé aux administrateurs.');
        } else {
          toast.error('Impossible de charger les données du tableau de bord');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending:    'bg-yellow-100 text-yellow-800 border-yellow-300',
      confirmed:  'bg-blue-100   text-blue-800   border-blue-300',
      shipped:    'bg-purple-100 text-purple-800 border-purple-300',
      delivered:  'bg-green-100  text-green-800  border-green-300',
      cancelled:  'bg-red-100    text-red-800    border-red-300',
    };

    return (
      <Badge
        variant="outline"
        className={colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Aperçu de l'activité de la boutique
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commandes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.totalOrders.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Toutes les commandes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes en attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.pendingOrders.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">À traiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `${stats.totalRevenue.toLocaleString()} DA`}
            </div>
            <p className="text-xs text-muted-foreground">Somme de toutes les commandes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes aujourd'hui</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.todayOrders.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Dernières 24 heures</p>
          </CardContent>
        </Card>
      

      {/* edit */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CA ce mois</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {loading ? '...' : `${stats.monthlyRevenue.toLocaleString()} DA`}
          </div>
          <p className="text-xs text-muted-foreground">Mois en cours</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taux d'annulation</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {loading ? '...' : `${stats.cancellationRate.toFixed(1)} %`}
          </div>
          <p className="text-xs text-muted-foreground">Sur total commandes</p>
        </CardContent>
      </Card>

      <Card>
      <CardHeader>
        <CardTitle>Top 5 Wilayas</CardTitle>
        <CardDescription>Par nombre de commandes</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div> : (
          <ul className="space-y-2">
            {stats.topWilayas.map((w) => (
              <li key={w._id} className="flex justify-between">
                <span>{w._id}</span>
                <Badge variant="secondary">{w.count} ({((w.count / stats.totalOrders) * 100).toFixed(1)}%)</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>

      </div>





      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commandes récentes</CardTitle>
              <CardDescription>Dernières 6 commandes</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/orders">Voir toutes les commandes</Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune commande récente
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow
                      key={order._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/orders/${order._id}`)}
                    >
                      <TableCell className="font-medium">
                        {order.customerName}
                        <div className="text-xs text-muted-foreground">
                          {order.wilaya} – {order.deliveryType}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.totalPrice.toLocaleString()} DA
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString('fr-DZ', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
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







      {/* Charts Row */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Chart 1: Daily Orders & Revenue */}
      <Card className="col-span-2"> {/* Wider for line chart */}
        <CardHeader>
          <CardTitle>Commandes & CA – 30 derniers jours</CardTitle>
          <CardDescription>Tendances quotidiennes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'revenue' && typeof value === 'number'
                      ? `${value.toLocaleString()} DA`
                      : value
                  }
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#8884d8" name="Commandes" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" name="CA (DA)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Revenue by Status (Bar) */}
      <Card>
        <CardHeader>
          <CardTitle>CA par statut</CardTitle>
          <CardDescription>Répartition des montants</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.revenueByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip
                      formatter={(value) =>
                        typeof value === 'number'
                          ? `${value.toLocaleString()} DA`
                          : value
                      }
                    />
                <Legend />
                <Bar dataKey="total" fill="#8884d8">
                  {stats.revenueByStatus.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'][index % 5] === 'delivered' ? '#82ca9d' : '#ff7300'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </div>

      
      {/* You can add more cards/sections later:
          - Produits les plus vendus
          - Stocks faibles
          - Graphique simple (recharts / chart.js)
      */}
    </div>
  );
}