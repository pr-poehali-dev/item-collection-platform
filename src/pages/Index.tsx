import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import * as XLSX from 'xlsx';

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  userId: string;
  userName: string;
}

const CATEGORIES = ['Овощи', 'Фрукты', 'Молочные продукты', 'Мясо и рыба', 'Бакалея', 'Напитки'];
const USERS = Array.from({ length: 12 }, (_, i) => ({ id: `user${i + 1}`, name: `Пользователь ${i + 1}` }));

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Помидоры', category: 'Овощи', unit: 'кг' },
  { id: '2', name: 'Огурцы', category: 'Овощи', unit: 'кг' },
  { id: '3', name: 'Яблоки', category: 'Фрукты', unit: 'кг' },
  { id: '4', name: 'Молоко', category: 'Молочные продукты', unit: 'л' },
  { id: '5', name: 'Курица', category: 'Мясо и рыба', unit: 'кг' },
  { id: '6', name: 'Рис', category: 'Бакалея', unit: 'кг' },
];

export default function Index() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [currentUser, setCurrentUser] = useState<string>('user1');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  const [newProduct, setNewProduct] = useState({ name: '', category: '', unit: '' });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToOrder = (product: Product, quantity: number) => {
    if (quantity <= 0) {
      toast.error('Количество должно быть больше нуля');
      return;
    }

    const user = USERS.find(u => u.id === currentUser);
    const newOrder: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      userId: currentUser,
      userName: user?.name || '',
    };

    setOrders([...orders, newOrder]);
    toast.success(`${product.name} добавлен в заказ`);
  };

  const addProduct = () => {
    if (!newProduct.name || !newProduct.category || !newProduct.unit) {
      toast.error('Заполните все поля');
      return;
    }

    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name,
      category: newProduct.category,
      unit: newProduct.unit,
    };

    setProducts([...products, product]);
    setNewProduct({ name: '', category: '', unit: '' });
    toast.success('Товар добавлен');
  };

  const aggregatedOrders = orders.reduce((acc, order) => {
    const key = `${order.productName}`;
    if (!acc[key]) {
      acc[key] = {
        productName: order.productName,
        totalQuantity: 0,
        users: [],
      };
    }
    acc[key].totalQuantity += order.quantity;
    acc[key].users.push({ userName: order.userName, quantity: order.quantity });
    return acc;
  }, {} as Record<string, { productName: string; totalQuantity: number; users: { userName: string; quantity: number }[] }>);

  const exportToExcel = () => {
    const data = Object.values(aggregatedOrders).map(item => ({
      'Товар': item.productName,
      'Общее количество': item.totalQuantity,
      'Заказы': item.users.map(u => `${u.userName}: ${u.quantity}`).join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Заказы');
    XLSX.writeFile(wb, `Заказы_${new Date().toLocaleDateString()}.xlsx`);
    toast.success('Excel файл загружен');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Icon name="ShoppingCart" size={28} />
              Система заказов
            </h1>
            <div className="flex items-center gap-4">
              <Select value={currentUser} onValueChange={setCurrentUser}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USERS.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={isAdmin ? 'default' : 'outline'}
                onClick={() => setIsAdmin(!isAdmin)}
              >
                <Icon name="Settings" size={18} className="mr-2" />
                {isAdmin ? 'Режим технолога' : 'Режим пользователя'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Icon name="Search" size={18} />
              Поиск товаров
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Icon name="ClipboardList" size={18} />
              Заказы
              {orders.length > 0 && (
                <Badge variant="default" className="ml-2">{orders.length}</Badge>
              )}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Icon name="Package" size={18} />
                Управление
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Найти товар</CardTitle>
                <CardDescription>Используйте поиск и фильтры для быстрого поиска</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Поиск по названию..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Все категории" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {filteredProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToOrder={addToOrder}
                    />
                  ))}
                </div>

                {filteredProducts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="Package" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Товары не найдены</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Сводка заказов</CardTitle>
                    <CardDescription>Все заказы от пользователей с автосуммированием</CardDescription>
                  </div>
                  <Button onClick={exportToExcel} disabled={orders.length === 0}>
                    <Icon name="Download" size={18} className="mr-2" />
                    Экспорт в Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {Object.values(aggregatedOrders).length > 0 ? (
                  <div className="space-y-4">
                    {Object.values(aggregatedOrders).map((item, idx) => (
                      <Card key={idx} className="border-l-4 border-l-primary">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{item.productName}</h3>
                            <Badge variant="secondary" className="text-lg px-4 py-1">
                              Всего: {item.totalQuantity}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {item.users.map((user, uIdx) => (
                              <div key={uIdx} className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded">
                                <span>{user.userName}</span>
                                <span className="font-medium">{user.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="ClipboardList" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Заказы пока не добавлены</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Управление каталогом</CardTitle>
                  <CardDescription>Добавляйте новые товары в каталог</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <Label htmlFor="productName">Название товара</Label>
                      <Input
                        id="productName"
                        placeholder="Например: Картофель"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="productCategory">Категория</Label>
                      <Select
                        value={newProduct.category}
                        onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                      >
                        <SelectTrigger id="productCategory">
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="productUnit">Единица измерения</Label>
                      <Input
                        id="productUnit"
                        placeholder="кг, л, шт"
                        value={newProduct.unit}
                        onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={addProduct} className="w-full md:w-auto">
                    <Icon name="Plus" size={18} className="mr-2" />
                    Добавить товар
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Каталог товаров ({products.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {products.map(product => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.category} • {product.unit}</p>
                        </div>
                        <Badge variant="outline">{product.category}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function ProductCard({ product, onAddToOrder }: { product: Product; onAddToOrder: (product: Product, quantity: number) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = () => {
    onAddToOrder(product, quantity);
    setQuantity(1);
    setIsOpen(false);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <Badge variant="secondary" className="mt-1">{product.category}</Badge>
          </div>
          <Icon name="Package" size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-4">Единица: {product.unit}</p>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Icon name="Plus" size={16} className="mr-2" />
              Добавить в заказ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription>Укажите количество для заказа</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="quantity">Количество ({product.unit})</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="mt-2"
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                Подтвердить
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
