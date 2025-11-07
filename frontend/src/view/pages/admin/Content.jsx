// frontend/src/view/pages/admin/Content.jsx
import { useEffect, useRef, useState } from "react";
import { banners as bannerApi } from "@/services/admin";
import { getImageUrl } from "@/services/api";
import { Plus, Trash2, Edit2, Upload } from "lucide-react";

const EMPTY_BANNER = {
  position: "home-hero",
  title: "",
  subtitle: "",
  ctaText: "Xem ngay",
  link: "/",
  imageUrl: "",
  active: true,
  sort: 0,
};

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-4 py-2 text-sm font-medium -mb-px border-b-2 " +
        (active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700")
      }
    >
      {label}
    </button>
  );
}

export default function Content() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">
        Nội dung &amp; Cấu hình
      </h2>
      <p className="text-base text-gray-600">
        Quản lý banner trang chủ và cấu hình hiển thị.
      </p>
      <BannerManager />
    </div>
  );
}

function BannerManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_BANNER });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [imgTab, setImgTab] = useState("upload"); // 'upload' | 'url'

  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await bannerApi.list();
      const data = res?.data ?? res;
      const list = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      list.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      setItems(list);
    } catch (e) {
      setError(e?.message || "Không tải được danh sách banner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_BANNER });
    setImgTab("upload");
    setError("");
  };

  const startEdit = (b) => {
    setEditingId(b._id);
    setForm({
      ...EMPTY_BANNER,
      ...b,
      sort: b.sort ?? 0,
    });
    setImgTab(
      b.imageUrl && b.imageUrl.startsWith("http") ? "url" : "upload"
    );
    setError("");
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        sort: Number(form.sort) || 0,
      };
      if (editingId) {
        await bannerApi.update(editingId, payload);
      } else {
        await bannerApi.create(payload);
      }
      await load();
      startCreate();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Lưu banner thất bại"
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa banner này?")) return;
    try {
      await bannerApi.remove(id);
      await load();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Xóa banner thất bại"
      );
    }
  };

  // Upload ảnh local -> /upload (đã cấu hình chung)
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!bannerApi.uploadImage) {
      alert("Chưa cấu hình banners.uploadImage trong services/admin.js.");
      e.target.value = "";
      return;
    }

    try {
      setUploading(true);
      const res = await bannerApi.uploadImage(file);
      const data = res?.data ?? res;
      const url = data?.url || data?.path;
      if (!url) throw new Error("API upload không trả về url/path");

      setForm((prev) => ({ ...prev, imageUrl: url }));
      setImgTab("upload");
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Upload ảnh thất bại"
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFile = () => {
    if (fileInputRef.current && !uploading) {
      fileInputRef.current.click();
    }
  };

  const previewSrc = form.imageUrl
    ? getImageUrl(form.imageUrl)
    : "";

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,2.2fr)_minmax(0,2.8fr)]">
      {/* FORM */}
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-lg text-gray-900">
            {editingId ? "Sửa banner" : "Thêm banner mới"}
          </h3>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <Plus className="w-4 h-4" />
            Mới
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-500">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Tiêu đề */}
          <label className="space-y-1 col-span-2">
            <span className="font-medium">Tiêu đề</span>
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              
              className="w-full border rounded-md px-3 py-2"
            />
          </label>

          {/* Subtitle */}
          <label className="space-y-1 col-span-2">
            <span className="font-medium">Mô tả / Subtitle</span>
            <textarea
              name="subtitle"
              value={form.subtitle}
              onChange={onChange}
              rows={3}
              className="w-full border rounded-md px-3 py-2"
            />
          </label>

          {/* CTA */}
          <label className="space-y-1">
            <span className="font-medium">CTA text</span>
            <input
              name="ctaText"
              value={form.ctaText}
              onChange={onChange}
              className="w-full border rounded-md px-3 py-2"
            />
          </label>

          {/* Link */}
          <label className="space-y-1">
            <span className="font-medium">
              Link (route / #anchor / url)
            </span>
            <input
              name="link"
              value={form.link}
              onChange={onChange}
              className="w-full border rounded-md px-3 py-2"
              placeholder="/books?sort=newest hoặc /#sale"
            />
          </label>

          {/* Ảnh banner */}
          <div className="col-span-2 space-y-1">
            <span className="font-medium">Ảnh banner</span>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mt-1">
              <TabButton
                label="Tải lên (Local)"
                active={imgTab === "upload"}
                onClick={() => setImgTab("upload")}
              />
              <TabButton
                label="Dán URL"
                active={imgTab === "url"}
                onClick={() => setImgTab("url")}
              />
            </div>

            {/* Nội dung theo tab */}
            {imgTab === "upload" && (
              <>
                {/* Dropzone ngang */}
                <div
                  onClick={triggerFile}
                  className="mt-3 w-full h-40 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center cursor-pointer overflow-hidden"
                >
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt="Preview banner"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = getImageUrl(null);
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-sm">
                        Bấm để tải ảnh banner (tỷ lệ ngang)
                      </span>
                      <span className="text-[10px]">
                        Khuyến nghị: 1200x300px hoặc tương đương
                      </span>
                    </div>
                  )}
                </div>
                {/* input file ẩn */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
                {uploading && (
                  <p className="text-xs text-blue-500 mt-1">
                    Đang upload ảnh...
                  </p>
                )}
              </>
            )}

            {imgTab === "url" && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  name="imageUrl"
                  value={
                    form.imageUrl?.startsWith("http")
                      ? form.imageUrl
                      : ""
                  }
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      imageUrl: e.target.value,
                    }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="https://example.com/banner.jpg"
                />
                <div className="w-full h-40 border rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                  {form.imageUrl?.startsWith("http") ? (
                    <img
                      src={form.imageUrl}
                      alt="Preview banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">
                      Dán URL hợp lệ để xem preview
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Vị trí */}
          <label className="space-y-1">
            <span className="font-medium">Vị trí</span>
            <input
              name="position"
              value={form.position}
              onChange={onChange}
              className="w-full border rounded-md px-3 py-2"
            />
          </label>

          {/* Thứ tự */}
          <label className="space-y-1">
            <span className="font-medium">Thứ tự</span>
            <input
              type="number"
              name="sort"
              value={form.sort}
              onChange={onChange}
              className="w-full border rounded-md px-3 py-2"
            />
          </label>

          {/* Active */}
          <label className="flex items-center gap-2 col-span-2 mt-1">
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={onChange}
              className="w-4 h-4"
            />
            <span className="text-sm">
              Kích hoạt (hiển thị trên trang)
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold"
        >
          {saving
            ? "Đang lưu..."
            : editingId
            ? "Cập nhật banner"
            : "Tạo banner"}
        </button>
      </form>

      {/* DANH SÁCH BANNER */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-gray-900">
            Danh sách banner
          </h3>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">
            Chưa có banner nào.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((b) => {
              const src = b.imageUrl
                ? getImageUrl(b.imageUrl)
                : "";
              return (
                <li
                  key={b._id}
                  className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm hover:border-blue-400"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {src && (
                      <img
                        src={src}
                        alt={b.title}
                        className="w-24 h-14 object-cover rounded-md border bg-gray-50"
                        onError={(e) => {
                          e.currentTarget.src = getImageUrl(null);
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-sm">
                        {b.title}
                        {!b.active && (
                          <span className="ml-1 text-[10px] text-red-500">
                            (đang tắt)
                          </span>
                        )}
                      </div>
                      {b.subtitle && (
                        <div className="text-gray-500 text-xs line-clamp-2">
                          {b.subtitle}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        pos: {b.position || "home-hero"} · sort:{" "}
                        {b.sort || 0} · link: {b.link}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      className="px-2.5 py-1.5 rounded-md border border-gray-200 hover:bg-blue-50 text-xs"
                    >
                      <Edit2 className="w-3 h-3 inline-block mr-1" />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(b._id)}
                      className="px-2.5 py-1.5 rounded-md border border-gray-200 hover:bg-red-50 text-xs text-red-600"
                    >
                      <Trash2 className="w-3 h-3 inline-block mr-1" />
                      Xóa
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
