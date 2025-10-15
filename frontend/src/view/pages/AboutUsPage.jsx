// src/view/pages/AboutUsPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart, Sparkles, Users, MapPin, Phone, Mail } from "lucide-react";
import { fetchPageBySlug } from "../../services/public";

// Ánh xạ tên icon từ dữ liệu sang component Icon thật
const iconMap = { Heart, Sparkles, Users };
const pickIcon = (name) => iconMap[name] || Sparkles;

const FALLBACK = {
  hero: {
    title: "Về BookStore",
    subtitle:
      "Nền tảng mua sách trực tuyến với trải nghiệm nhanh, dễ và giá tốt.",
    backgroundImage:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=1600&q=80&auto=format&fit=crop",
  },
  mission: {
    title: "Sứ mệnh của chúng tôi",
    description:
      "Kết nối độc giả với tri thức chất lượng, hỗ trợ tác giả và nhà xuất bản đưa tác phẩm đến gần hơn với mọi người.",
  },
  coreValues: [
    { icon: "Heart", title: "Tận tâm", description: "Dịch vụ chăm sóc tận tình." },
    { icon: "Sparkles", title: "Chất lượng", description: "Sách chính hãng, chọn lọc." },
    { icon: "Users", title: "Cộng đồng", description: "Xây dựng văn hoá đọc bền vững." },
  ],
  contact: {
    title: "Liên hệ",
    description: "Chúng tôi luôn sẵn sàng hỗ trợ bạn trong giờ hành chính.",
    address: "123 Đường ABC, Quận 1, TP.HCM",
    phone: "0123 456 789",
    email: "support@bookstore.vn",
  },
};

export default function AboutUsPage() {
  const [pageData, setPageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setIsLoading(true);
        setErr("");
        const data = await fetchPageBySlug("about"); // -> /api/public/pages/about
        if (!alive) return;
        setPageData(data || null);
        const title =
          (data && (data.title || data.hero?.title)) || "Giới thiệu - BookStore";
        document.title = title;
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Không thể tải trang");
        setPageData(null);
        document.title = "Giới thiệu - BookStore";
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const hasHtmlContent = useMemo(
    () => !!(pageData && typeof pageData.content === "string" && pageData.content.trim()),
    [pageData]
  );

  if (isLoading) {
    return <div className="container px-4 py-40 text-center">Đang tải dữ liệu…</div>;
  }

  // ===== Trường hợp 1: CMS trả content HTML =====
  if (hasHtmlContent) {
    return (
      <div className="container px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">
          {pageData.title || "Giới thiệu về chúng tôi"}
        </h1>
        {err && (
          <div className="text-sm text-amber-600 mb-4">
            {`Lưu ý: ${err}. Hiển thị nội dung được lưu trong hệ thống.`}
          </div>
        )}
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: pageData.content }}
        />
      </div>
    );
  }

  // ===== Trường hợp 2: Dữ liệu dạng section (hero/mission/...) hoặc không có -> dùng FALLBACK =====
  const data = {
    hero: pageData?.hero || FALLBACK.hero,
    mission: pageData?.mission || FALLBACK.mission,
    coreValues:
      (Array.isArray(pageData?.coreValues) && pageData.coreValues.length
        ? pageData.coreValues
        : FALLBACK.coreValues),
    contact: pageData?.contact || FALLBACK.contact,
  };

  return (
    <div className="bg-white">
      {err && (
        <div className="container px-4 pt-6 text-sm text-amber-600">
          {`Không thể tải dữ liệu đầy đủ. Đang hiển thị nội dung mặc định.`}
        </div>
      )}

      {/* ===== 1. HERO SECTION ===== */}
      <section
        className="relative bg-cover bg-center text-white py-24 md:py-32"
        style={{ backgroundImage: `url('${data.hero.backgroundImage}')` }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
            {data.hero.title}
          </h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto">
            {data.hero.subtitle}
          </p>
        </div>
      </section>

      {/* ===== 2. OUR MISSION SECTION ===== */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4">{data.mission.title}</h2>
            <p className="text-gray-600">{data.mission.description}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {data.coreValues.map((value, idx) => {
              const Icon = pickIcon(value.icon);
              return (
                <div key={idx} className="p-6">
                  <Icon className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== 3. CONTACT & CTA SECTION ===== */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">{data.contact.title}</h2>
              <p className="text-gray-600 mb-8">{data.contact.description}</p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Địa chỉ văn phòng</h4>
                    <p className="text-gray-600">{data.contact.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Số điện thoại hỗ trợ</h4>
                    <a
                      href={`tel:${data.contact.phone}`}
                      className="text-gray-600 hover:text-blue-600"
                    >
                      {data.contact.phone}{" "}
                      <span className="text-sm">(Giờ hành chính, T2–T6)</span>
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Mail className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Email</h4>
                    <a
                      href={`mailto:${data.contact.email}`}
                      className="text-gray-600 hover:text-blue-600"
                    >
                      {data.contact.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-8 md:p-12 text-center shadow-2xl shadow-blue-200">
              <h3 className="text-3xl font-extrabold mb-4">
                Bạn đã sẵn sàng cho cuộc phiêu lưu tri thức tiếp theo?
              </h3>
              <p className="mb-8 max-w-md mx-auto">
                Hàng ngàn đầu sách hấp dẫn đang chờ bạn khám phá. Hãy bắt đầu
                hành trình của bạn ngay hôm nay!
              </p>
              <Link
                to="/categories"
                className="inline-block bg-white text-blue-600 font-bold text-lg px-10 py-4 rounded-full hover:bg-gray-100 transform hover:scale-105 transition-transform duration-300"
              >
                Khám Phá Toàn Bộ Sách
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
