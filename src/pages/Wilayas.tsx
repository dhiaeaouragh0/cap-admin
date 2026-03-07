// src/pages/Wilayas.tsx
import { useEffect, useState, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Wilaya {
  _id: string;
  numero: number;
  nom: string;
  prixDomicile: number;
  prixAgence: number;
  createdAt: string;
  updatedAt: string;
}

export default function Wilayas() {
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWilaya, setEditingWilaya] = useState<Wilaya | null>(null);
  const [newWilaya, setNewWilaya] = useState({
    numero: '',
    nom: '',
    prixDomicile: '',
    prixAgence: '',
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const role = localStorage.getItem('userRole') || 'confirmateur';
  const isAdmin = role === 'admin';

  const nomInputRef = useRef<HTMLInputElement>(null);

  const fetchWilayas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shipping-wilayas');
      // Tri par numéro croissant
      const sorted = (res.data || []).sort((a: Wilaya, b: Wilaya) => a.numero - b.numero);
      setWilayas(sorted);
    } catch (err: any) {
      console.error('Wilayas fetch error:', err);
      toast.error('Impossible de charger les wilayas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWilayas();
  }, []);

  useEffect(() => {
    if (isAddDialogOpen && nomInputRef.current) {
      nomInputRef.current.focus();
    }
  }, [isAddDialogOpen]);

  const filteredWilayas = wilayas.filter(
    (w) =>
      w.nom.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      String(w.numero).includes(searchTerm.trim())
  );

  const handleAdd = async () => {
    if (!isAdmin) return;

    const { numero, nom, prixDomicile, prixAgence } = newWilaya;

    if (!numero || !nom || !prixDomicile || !prixAgence) {
      toast.error('Tous les champs sont obligatoires');
      return;
    }

    const num = Number(numero);
    const dom = Number(prixDomicile);
    const ag = Number(prixAgence);

    if (isNaN(num) || num < 1 || num > 58) {
      toast.error('Numéro de wilaya invalide (1–58)');
      return;
    }
    if (isNaN(dom) || dom < 0 || isNaN(ag) || ag < 0) {
      toast.error('Les prix doivent être positifs');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/shipping-wilayas', {
        numero: num,
        nom: nom.trim(),
        prixDomicile: dom,
        prixAgence: ag,
      });

      toast.success('Wilaya ajoutée avec succès');
      setWilayas((prev) => [...prev, res.data].sort((a, b) => a.numero - b.numero));
      setNewWilaya({ numero: '', nom: '', prixDomicile: '', prixAgence: '' });
      setIsAddDialogOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(
        msg?.includes('duplicate') || msg?.includes('unique')
          ? 'Cette wilaya (numéro ou nom) existe déjà'
          : msg || 'Erreur lors de l’ajout'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!isAdmin || !editingWilaya) return;

    const { prixDomicile, prixAgence } = editingWilaya;

    if (prixDomicile < 0 || prixAgence < 0) {
      toast.error('Les prix ne peuvent pas être négatifs');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.put(`/shipping-wilayas/${editingWilaya.numero}`, {
        nom: editingWilaya.nom.trim(),
        prixDomicile,
        prixAgence,
      });

      toast.success('Wilaya mise à jour');
      setWilayas((prev) =>
        prev.map((w) => (w._id === res.data._id ? res.data : w))
      );
      setEditingWilaya(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (numero: number) => {
    if (!isAdmin) return;

    setActionLoading(true);
    try {
      await api.delete(`/shipping-wilayas/${numero}`);
      toast.success('Wilaya supprimée');
      setWilayas((prev) => prev.filter((w) => w.numero !== numero));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    price.toLocaleString('fr-DZ', { minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Wilayas & Frais de livraison</h1>

        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle wilaya
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter une wilaya</DialogTitle>
                <DialogDescription>
                  Les numéros vont de 1 à 58. Les doublons sont interdits.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="numero" className="text-right">
                    N°
                  </Label>
                  <Input
                    id="numero"
                    type="number"
                    min={1}
                    max={58}
                    className="col-span-3"
                    value={newWilaya.numero}
                    onChange={(e) => setNewWilaya({ ...newWilaya, numero: e.target.value })}
                    placeholder="1–58"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nom" className="text-right">
                    Nom
                  </Label>
                  <Input
                    ref={nomInputRef}
                    id="nom"
                    className="col-span-3"
                    value={newWilaya.nom}
                    onChange={(e) => setNewWilaya({ ...newWilaya, nom: e.target.value })}
                    placeholder="ex : ALGER, ORAN, CONSTANTINE"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="prixDomicile" className="text-right">
                    Domicile
                  </Label>
                  <Input
                    id="prixDomicile"
                    type="number"
                    min={0}
                    className="col-span-3"
                    value={newWilaya.prixDomicile}
                    onChange={(e) => setNewWilaya({ ...newWilaya, prixDomicile: e.target.value })}
                    placeholder="ex : 550"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="prixAgence" className="text-right">
                    Agence
                  </Label>
                  <Input
                    id="prixAgence"
                    type="number"
                    min={0}
                    className="col-span-3"
                    value={newWilaya.prixAgence}
                    onChange={(e) => setNewWilaya({ ...newWilaya, prixAgence: e.target.value })}
                    placeholder="ex : 450"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={actionLoading}>
                  Annuler
                </Button>
                <Button onClick={handleAdd} disabled={actionLoading}>
                  {actionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    'Ajouter'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Frais de livraison par wilaya</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher nom ou numéro..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredWilayas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? 'Aucune wilaya ne correspond à votre recherche' : 'Aucune wilaya enregistrée'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">N°</TableHead>
                    <TableHead>Wilaya</TableHead>
                    <TableHead className="text-right">Domicile (DA)</TableHead>
                    <TableHead className="text-right">Agence (DA)</TableHead>
                    {isAdmin && <TableHead className="w-32 text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWilayas.map((wilaya) => (
                    <TableRow key={wilaya._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{wilaya.numero}</TableCell>
                      <TableCell className="font-medium">
                        {editingWilaya?._id === wilaya._id ? (
                          <Input
                            value={editingWilaya.nom}
                            onChange={(e) =>
                              setEditingWilaya({ ...editingWilaya, nom: e.target.value })
                            }
                            className="w-full"
                          />
                        ) : (
                          wilaya.nom
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {editingWilaya?._id === wilaya._id ? (
                          <Input
                            type="number"
                            min={0}
                            value={editingWilaya.prixDomicile}
                            onChange={(e) =>
                              setEditingWilaya({
                                ...editingWilaya,
                                prixDomicile: Number(e.target.value) || 0,
                              })
                            }
                            className="w-28 text-right mx-auto"
                          />
                        ) : (
                          formatPrice(wilaya.prixDomicile)
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {editingWilaya?._id === wilaya._id ? (
                          <Input
                            type="number"
                            min={0}
                            value={editingWilaya.prixAgence}
                            onChange={(e) =>
                              setEditingWilaya({
                                ...editingWilaya,
                                prixAgence: Number(e.target.value) || 0,
                              })
                            }
                            className="w-28 text-right mx-auto"
                          />
                        ) : (
                          formatPrice(wilaya.prixAgence)
                        )}
                      </TableCell>

                      {isAdmin && (
                        <TableCell className="text-right space-x-1">
                          {editingWilaya?._id === wilaya._id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={handleUpdate}
                                disabled={actionLoading}
                              >
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingWilaya(null)}
                                disabled={actionLoading}
                              >
                                Annuler
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingWilaya({ ...wilaya })}
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
                                    <AlertDialogTitle>Supprimer la wilaya ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Vous allez supprimer définitivement « {wilaya.nom} » (N° {wilaya.numero}).
                                      Cette action est irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive hover:bg-destructive/90"
                                      onClick={() => handleDelete(wilaya.numero)}
                                      disabled={actionLoading}
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </TableCell>
                      )}
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