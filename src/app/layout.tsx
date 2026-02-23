import "./globals.css";
import { BusinessProvider } from "@/context/BusinessContext";
import AppLayout from "@/components/AppLayout";

export const metadata = {
  title: "Admin Panel",
  description: "Admin Panel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <BusinessProvider>
          <AppLayout>{children}</AppLayout>
        </BusinessProvider>
      </body>
    </html>
  );
}