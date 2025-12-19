import { useState, ChangeEvent } from 'react';
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
  code: string;
  name: string;
  unit: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  userId: string;
  userName: string;
}

interface User {
  id: string;
  name: string;
}

const INITIAL_USERS: User[] = Array.from({ length: 12 }, (_, i) => ({ id: `user${i + 1}`, name: `Пользователь ${i + 1}` }));

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', code: 'TOV-001', name: 'Помидоры', unit: 'кг' },
  { id: '2', code: 'TOV-002', name: 'Огурцы', unit: 'кг' },
  { id: '3', code: 'TOV-003', name: 'Яблоки', unit: 'кг' },
  { id: '4', code: 'TOV-004', name: 'Молоко', unit: 'л' },
  { id: '5', code: 'TOV-005', name: 'Курица', unit: 'кг' },
  { id: '6', code: 'TOV-006', name: 'Рис', unit: 'кг' },
];

export default function Index() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<string>('user1');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');

  const [newProduct, setNewProduct] = useState({ code: '', name: '', unit: '' });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const addToOrder = (product: Product, quantity: number) => {
    if (quantity <= 0) {
      toast.error('Количество должно быть больше нуля');
      return;
    }

    const user = users.find(u => u.id === currentUser);
    const newOrder: OrderItem = {
      id: Date.now().toString(),
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      quantity,
      userId: currentUser,
      userName: user?.name || '',
    };

    setOrders([...orders, newOrder]);
    toast.success(`${product.name} добавлен в заказ`);
  };

  const deleteOrder = (orderId: string) => {
    setOrders(orders.filter(order => order.id !== orderId));
    toast.success('Заказ удалён');
  };

  const updateOrderQuantity = (orderId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      deleteOrder(orderId);
      return;
    }
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, quantity: newQuantity } : order
    ));
    toast.success('Количество обновлено');
  };

  const addProduct = () => {
    if (!newProduct.code || !newProduct.name || !newProduct.unit) {
      toast.error('Заполните все поля');
      return;
    }

    if (products.some(p => p.code === newProduct.code)) {
      toast.error('Товар с таким кодом уже существует');
      return;
    }

    const product: Product = {
      id: Date.now().toString(),
      code: newProduct.code,
      name: newProduct.name,
      unit: newProduct.unit,
    };

    setProducts([...products, product]);
    setNewProduct({ code: '', name: '', unit: '' });
    toast.success('Товар добавлен');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

        const newProducts: Product[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, idx) => {
          const code = row['Код'] || row['code'] || row['Код товара'];
          const name = row['Название'] || row['name'] || row['Товар'];
          const unit = row['Единица'] || row['unit'] || row['Единица измерения'];

          if (!code || !name || !unit) {
            errors.push(`Строка ${idx + 2}: не все поля заполнены`);
            return;
          }

          if (products.some(p => p.code === code) || newProducts.some(p => p.code === code)) {
            errors.push(`Строка ${idx + 2}: товар с кодом ${code} уже существует`);
            return;
          }

          newProducts.push({
            id: `${Date.now()}-${idx}`,
            code: String(code),
            name: String(name),
            unit: String(unit),
          });
        });

        if (newProducts.length > 0) {
          setProducts([...products, ...newProducts]);
          toast.success(`Добавлено товаров: ${newProducts.length}`);
        }

        if (errors.length > 0) {
          toast.error(`Ошибок: ${errors.length}. Проверьте файл.`);
          console.error(errors);
        }

        if (newProducts.length === 0 && errors.length === 0) {
          toast.error('Файл пуст или неверный формат');
        }
      } catch (error) {
        toast.error('Ошибка чтения файла');
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const template = [
      { 'Код': 'TOV-001', 'Название': 'Пример товара', 'Единица': 'кг' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Товары');
    XLSX.writeFile(wb, 'Шаблон_товаров.xlsx');
    toast.success('Шаблон скачан');
  };

  const deleteProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const hasOrders = orders.some(o => o.productCode === product.code);
    if (hasOrders) {
      toast.error('Нельзя удалить товар, по которому есть заказы');
      return;
    }

    setProducts(products.filter(p => p.id !== productId));
    toast.success('Товар удалён');
  };

  const startEditingUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setEditingUserId(userId);
      setEditingUserName(user.name);
    }
  };

  const saveUserName = () => {
    if (!editingUserName.trim()) {
      toast.error('Имя не может быть пустым');
      return;
    }

    setUsers(users.map(u => 
      u.id === editingUserId ? { ...u, name: editingUserName } : u
    ));
    
    setOrders(orders.map(o => 
      o.userId === editingUserId ? { ...o, userName: editingUserName } : o
    ));
    
    setEditingUserId(null);
    setEditingUserName('');
    toast.success('Имя пользователя обновлено');
  };

  const cancelEditingUser = () => {
    setEditingUserId(null);
    setEditingUserName('');
  };

  const aggregatedOrders = orders.reduce((acc, order) => {
    const key = `${order.productName}`;
    if (!acc[key]) {
      acc[key] = {
        productCode: order.productCode,
        productName: order.productName,
        totalQuantity: 0,
        orders: [],
      };
    }
    acc[key].totalQuantity += order.quantity;
    acc[key].orders.push({ id: order.id, userName: order.userName, quantity: order.quantity });
    return acc;
  }, {} as Record<string, { productCode: string; productName: string; totalQuantity: number; orders: { id: string; userName: string; quantity: number }[] }>);

  const exportToExcel = () => {
    const data = Object.values(aggregatedOrders).map(item => ({
      'Код товара': item.productCode,
      'Товар': item.productName,
      'Общее количество': item.totalQuantity,
      'Заказы': item.orders.map(u => `${u.userName}: ${u.quantity}`).join(', '),
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
                  {users.map(user => (
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
                  <Input
                    placeholder="Поиск по коду или названию..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
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
                            <div>
                              <h3 className="text-lg font-semibold">{item.productName}</h3>
                              <p className="text-sm text-muted-foreground">Код: {item.productCode}</p>
                            </div>
                            <Badge variant="secondary" className="text-lg px-4 py-1">
                              Всего: {item.totalQuantity}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {item.orders.map((order) => (
                              <div key={order.id} className="flex items-center justify-between text-sm bg-muted/50 px-3 py-2 rounded group">
                                <span className="text-muted-foreground">{order.userName}</span>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={order.quantity}
                                    onChange={(e) => updateOrderQuantity(order.id, Number(e.target.value))}
                                    className="w-20 h-8 text-center"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteOrder(order.id)}
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Icon name="Trash2" size={16} className="text-destructive" />
                                  </Button>
                                </div>
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
                  <CardDescription>Добавляйте товары вручную или загружайте из Excel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Массовая загрузка</h4>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={downloadTemplate}>
                        <Icon name="Download" size={18} className="mr-2" />
                        Скачать шаблон
                      </Button>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          id="file-upload"
                        />
                        <Button variant="default">
                          <Icon name="Upload" size={18} className="mr-2" />
                          Загрузить Excel
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Формат файла: колонки "Код", "Название", "Единица"
                    </p>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="text-sm font-medium mb-3">Добавить вручную</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label htmlFor="productCode">Код товара</Label>
                        <Input
                          id="productCode"
                          placeholder="TOV-007"
                          value={newProduct.code}
                          onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                        />
                      </div>
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
                  </div>
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
                          <p className="text-sm text-muted-foreground">Код: {product.code} • {product.unit}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProduct(product.id)}
                        >
                          <Icon name="Trash2" size={16} className="text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Управление пользователями ({users.length})</CardTitle>
                  <CardDescription>Редактируйте имена пользователей</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {users.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        {editingUserId === user.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingUserName}
                              onChange={(e) => setEditingUserName(e.target.value)}
                              className="flex-1"
                              placeholder="Имя пользователя"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveUserName();
                                if (e.key === 'Escape') cancelEditingUser();
                              }}
                              autoFocus
                            />
                            <Button size="sm" onClick={saveUserName}>
                              <Icon name="Check" size={16} />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditingUser}>
                              <Icon name="X" size={16} />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingUser(user.id)}
                            >
                              <Icon name="Pencil" size={16} />
                            </Button>
                          </>
                        )}
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
          </div>
          <Icon name="Package" size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">Код: {product.code}</p>
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