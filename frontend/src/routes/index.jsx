import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../components/layout/AdminLayout.jsx'
import { AuthLayout } from '../components/layout/AuthLayout.jsx'
import { StoreLayout } from '../components/layout/StoreLayout.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'
import { Forbidden } from '../pages/Forbidden.jsx'
import { NotFound } from '../pages/NotFound.jsx'
import { Login } from '../pages/account/Login.jsx'
import { MyOrders } from '../pages/account/MyOrders.jsx'
import { OrderDetails } from '../pages/account/OrderDetails.jsx'
import { Register } from '../pages/account/Register.jsx'
import { Cart } from '../pages/cart/Cart.jsx'
import { Checkout } from '../pages/cart/Checkout.jsx'
import { OrderConfirmation } from '../pages/cart/OrderConfirmation.jsx'
import { Home } from '../pages/storefront/Home.jsx'
import { ProductDetails } from '../pages/storefront/ProductDetails.jsx'
import { Shop } from '../pages/storefront/Shop.jsx'
import { AdminRoute } from './AdminRoute.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'

const Dashboard = lazy(() =>
  import('../pages/admin/Dashboard.jsx').then((m) => ({ default: m.Dashboard })),
)
const AdminProducts = lazy(() =>
  import('../pages/admin/Products.jsx').then((m) => ({ default: m.AdminProducts })),
)
const ProductEdit = lazy(() =>
  import('../pages/admin/ProductEdit.jsx').then((m) => ({ default: m.ProductEdit })),
)
const AdminCategories = lazy(() =>
  import('../pages/admin/Categories.jsx').then((m) => ({ default: m.AdminCategories })),
)
const AdminOrders = lazy(() =>
  import('../pages/admin/Orders.jsx').then((m) => ({ default: m.AdminOrders })),
)
const AdminOrderDetails = lazy(() =>
  import('../pages/admin/AdminOrderDetails.jsx').then((m) => ({ default: m.AdminOrderDetails })),
)

function WithTitle({ title, children }) {
  useEffect(() => {
    document.title = title
  }, [title])
  return children
}

function AdminSuspense({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Storefront & Customer routes */}
      <Route element={<StoreLayout />}>
        <Route
          path="/"
          element={
            <WithTitle title="Bazaaro — Online Store">
              <Home />
            </WithTitle>
          }
        />
        <Route
          path="/shop"
          element={
            <WithTitle title="Shop | Bazaaro">
              <Shop />
            </WithTitle>
          }
        />
        <Route
          path="/products/:slug"
          element={
            <WithTitle title="Product | Bazaaro">
              <ProductDetails />
            </WithTitle>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <WithTitle title="Shopping cart | Bazaaro">
                <Cart />
              </WithTitle>
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <WithTitle title="Checkout | Bazaaro">
                <Checkout />
              </WithTitle>
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-confirmation/:id"
          element={
            <ProtectedRoute>
              <WithTitle title="Order confirmation | Bazaaro">
                <OrderConfirmation />
              </WithTitle>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <WithTitle title="My orders | Bazaaro">
                <MyOrders />
              </WithTitle>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <WithTitle title="Order details | Bazaaro">
                <OrderDetails />
              </WithTitle>
            </ProtectedRoute>
          }
        />
        <Route
          path="/forbidden"
          element={
            <WithTitle title="Access denied | Bazaaro">
              <Forbidden />
            </WithTitle>
          }
        />
        <Route
          path="*"
          element={
            <WithTitle title="Page not found | Bazaaro">
              <NotFound />
            </WithTitle>
          }
        />
      </Route>

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <WithTitle title="Sign in | Bazaaro">
              <Login />
            </WithTitle>
          }
        />
        <Route
          path="/register"
          element={
            <WithTitle title="Create account | Bazaaro">
              <Register />
            </WithTitle>
          }
        />
      </Route>

      {/* Admin routes (lazy loaded) */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route
          index
          element={
            <WithTitle title="Dashboard | Bazaaro Admin">
              <AdminSuspense>
                <Dashboard />
              </AdminSuspense>
            </WithTitle>
          }
        />
        <Route
          path="products"
          element={
            <WithTitle title="Products | Bazaaro Admin">
              <AdminSuspense>
                <AdminProducts />
              </AdminSuspense>
            </WithTitle>
          }
        />
        <Route
          path="products/new"
          element={
            <WithTitle title="Add product | Bazaaro Admin">
              <AdminSuspense>
                <ProductEdit />
              </AdminSuspense>
            </WithTitle>
          }
        />
        <Route
          path="products/:id/edit"
          element={
            <WithTitle title="Edit product | Bazaaro Admin">
              <AdminSuspense>
                <ProductEdit />
              </AdminSuspense>
            </WithTitle>
          }
        />
        <Route
          path="categories"
          element={
            <WithTitle title="Categories | Bazaaro Admin">
              <AdminSuspense>
                <AdminCategories />
              </AdminSuspense>
            </WithTitle>
          }
        />
        <Route
          path="orders"
          element={
            <WithTitle title="Orders | Bazaaro Admin">
              <AdminSuspense>
                <AdminOrders />
              </AdminSuspense>
            </WithTitle>
          }
        />
        <Route
          path="orders/:id"
          element={
            <WithTitle title="Order details | Bazaaro Admin">
              <AdminSuspense>
                <AdminOrderDetails />
              </AdminSuspense>
            </WithTitle>
          }
        />
      </Route>
    </Routes>
  )
}
