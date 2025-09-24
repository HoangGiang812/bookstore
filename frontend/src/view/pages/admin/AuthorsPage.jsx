import React, { useState, useEffect } from "react";
import {
  UserPlus,
  BookOpen,
  Link as LinkIcon,
  Image as ImageIcon,
  Info,
  Pencil,
  Trash2,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import api from "../../../services/api";

const normalizeList = (r) => {
  if (Array.isArray(r)) return r;
  if (r?.items) return r.items;
  if (r?.data) return r.data;
  return [];
};

const isHttpUrl = (u = "") => /^https?:\/\//i.test(u);

export default function AuthorsPage() {
  const [authors, setAuthors] = useState([]);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(""); // http(s) hoặc data URL
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const [banner, setBanner] = useState(null); // {type:'success'|'warning'|'error', text:string}

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    try {
      const r = await api.get("/authors");
      setAuthors(normalizeList(r));
    } catch (e) {
      console.error("Load authors error", e);
      setAuthors([]);
      setBanner({ type: "error", text: "Không tải được danh sách tác giả." });
    }
  };

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(t);
  }, [banner]);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);

      const res = await api.post("/authors", {
        name: name.trim(),
        avatarUrl: avatar.trim() || null, // ✅ BE dùng avatarUrl
        bio: bio.trim() || null,
      });
      const data = res?.data ?? res;

      if (data?._existed) {
        setBanner({
          type: "warning",
          text: "Tác giả đã tồn tại, thông tin đã được cập nhật.",
        });
      } else {
        setBanner({ type: "success", text: "Đã thêm tác giả mới." });
      }

      setName("");
      setAvatar("");
      setBio("");
      await load();
    } catch (e) {
      console.error("Create author error", e);
      setBanner({ type: "error", text: "Không thể tạo/cập nhật tác giả." });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (a) => {
    const idKey = a.id || a._id || a.slug;
    setEditingId(idKey);
    setEditName(a.name || "");

    // ✅ Đồng bộ: lấy đúng ảnh theo mọi key khả dụng
    const firstImg =
      [a.avatar, a.avatarUrl, a.photoUrl, a.imageUrl, a.image, a.picture]
        .find(Boolean) || "";
    setEditAvatar(firstImg);
    setEditBio(a.bio || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditAvatar("");
    setEditBio("");
  };

  const saveEdit = async (a) => {
    try {
      setSavingEdit(true);
      const idOrSlug = a.slug || a.id || a._id;

      const payload = {
        name: editName.trim(),
        avatarUrl: editAvatar.trim() || null, // ✅ gửi avatarUrl
        bio: editBio.trim() || "",
      };
      await api.patch(`/authors/${idOrSlug}`, payload);
      setBanner({ type: "success", text: "Đã lưu thay đổi." });
      cancelEdit();
      await load();
    } catch (e) {
      console.error("Save edit error", e);
      setBanner({ type: "error", text: "Không lưu được thay đổi." });
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (a) => {
    const idOrSlug = a.slug || a.id || a._id;
    if (!idOrSlug) return;
    if (!confirm(`Xoá tác giả "${a.name}"?`)) return;
    try {
      await api.delete(`/authors/${idOrSlug}`);
      setBanner({ type: "success", text: "Đã xoá tác giả." });
      await load();
    } catch (e) {
      console.error("Delete author error", e);
      setBanner({ type: "error", text: "Không thể xoá tác giả." });
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* TIÊU ĐỀ */}
      <div className="flex items-center gap-3 mb-1">
        <BookOpen className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Quản lý Tác giả</h2>
      </div>

      {/* BANNER */}
      {banner && (
        <div
          className={
            "rounded-lg border p-3 text-sm flex items-start gap-2 " +
            (banner.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : banner.type === "warning"
              ? "bg-yellow-50 border-yellow-200 text-yellow-800"
              : "bg-red-50 border-red-200 text-red-800")
          }
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* GIỚI THIỆU */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700 flex items-start gap-2">
        <Info className="w-5 h-5 text-blue-500 mt-0.5" />
        <p>
          Trang này cho phép bạn <b>thêm mới</b>, <b>sửa</b> hoặc <b>xóa</b>{" "}
          tác giả. Ảnh có thể là <i>URL http(s)</i> hoặc{" "}
          <i>data URL base64</i> (bắt đầu bằng
          <code> data:image/...;base64,</code>).
        </p>
      </div>

      {/* FORM THÊM */}
      <form
        onSubmit={create}
        className="bg-white rounded-xl shadow-sm border p-6 space-y-4"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Thêm tác giả mới
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên tác giả
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Nhập tên tác giả"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ảnh (URL hoặc data URL)
            </label>
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="https://example.com/author.jpg hoặc data:image/jpeg;base64,..."
            />
            {/* Preview ảnh nhập vào */}
            {avatar?.trim() && (
              <div className="mt-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                  <img
                    src={avatar.trim()}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    {...(isHttpUrl(avatar)
                      ? { referrerPolicy: "no-referrer" }
                      : {})}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/96?text=No+Image";
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500">Xem thử ảnh</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giới thiệu
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            rows={3}
            placeholder="Viết một vài dòng giới thiệu về tác giả..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Đang lưu..." : "Thêm tác giả"}
        </button>
      </form>

      {/* DANH SÁCH */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Danh sách tác giả</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {authors.map((a) => {
            const idKey = a.id || a._id || a.slug;
            const isEditing = editingId === idKey;

            // ✅ Đồng bộ: ưu tiên avatar (đã proxify), fallback avatarUrl/alias
            const imgSrc =
              [a.avatar, a.avatarUrl, a.photoUrl, a.imageUrl, a.image, a.picture]
                .find(Boolean)?.toString()
                .trim() || "";

            return (
              <div
                key={idKey}
                className="flex items-start gap-3 border rounded-lg p-3 bg-gray-50"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={a.name}
                      className="w-full h-full object-cover"
                      {...(isHttpUrl(imgSrc)
                        ? { referrerPolicy: "no-referrer" }
                        : {})}
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://via.placeholder.com/96?text=No+Image";
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                <div className="flex-1">
                  {!isEditing ? (
                    <>
                      <p className="font-medium">{a.name}</p>
                      {a.bio && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {a.bio}
                        </p>
                      )}
                      {a.slug && (
                        <a
                          href={`/authors/${a.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          <LinkIcon className="w-3 h-3" />
                          Xem trang tác giả
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border rounded-lg px-2 py-1 mb-2"
                        placeholder="Tên tác giả"
                      />
                      <input
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="w-full border rounded-lg px-2 py-1 mb-2"
                        placeholder="Ảnh (URL hoặc data URL)"
                      />
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        className="w-full border rounded-lg px-2 py-1 mb-2"
                        rows={2}
                        placeholder="Giới thiệu"
                      />
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 items-end">
                  {!isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(a)}
                        className="p-2 rounded-md hover:bg-white border text-gray-600"
                        title="Sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(a)}
                        className="p-2 rounded-md hover:bg-white border text-red-600"
                        title="Xoá"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={() => saveEdit(a)}
                        className="p-2 rounded-md hover:bg-white border text-green-600 disabled:opacity-50"
                        title="Lưu"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={cancelEdit}
                        className="p-2 rounded-md hover:bg-white border text-gray-600 disabled:opacity-50"
                        title="Huỷ"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {authors.length === 0 && (
            <div className="text-gray-500">Chưa có tác giả nào</div>
          )}
        </div>
      </div>
    </div>
  );
}
