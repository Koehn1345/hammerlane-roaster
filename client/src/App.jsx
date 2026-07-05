import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Roasting from './pages/Roasting'
import History from './pages/History'
import Billing from './pages/Billing'
import RoastingItemDetail from './pages/RoastingItemDetail'
import OrderItemDetail from './pages/OrderItemDetail'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Blends from './pages/Blends'
import BlendDetail from './pages/BlendDetail'
import GreenBeanInventory from './pages/GreenBeanInventory'
import BagInventory from './pages/BagInventory'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="roasting" element={<Roasting />} />
        <Route path="history"  element={<History />} />
        <Route path="billing" element={<Billing />} />
        <Route path="roasting/items/:itemId" element={<RoastingItemDetail />} />
        <Route path="orders/items/:itemId" element={<OrderItemDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="blends" element={<Blends />} />
        <Route path="blends/:id" element={<BlendDetail />} />
        <Route path="green-beans" element={<GreenBeanInventory />} />
        <Route path="bags" element={<BagInventory />} />
      </Route>
    </Routes>
  )
}

export default App
