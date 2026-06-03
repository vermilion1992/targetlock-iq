import BreadcrumbComp from "@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp";
import EcommerceShop from "@/app/components/apps/ecommerce/productgrid";
import { ProductProvider } from "@/app/context/ecommerce-context";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Ecommerce Shop",
};
const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Shop",
  },
];

const Ecommerce = () => {
  return (
    <>
      <ProductProvider>
        <BreadcrumbComp title="Shop App" items={BCrumb} />
        <EcommerceShop />
      </ProductProvider>
    </>
  );
};

export default Ecommerce;
