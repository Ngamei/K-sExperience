"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/use-t";

/**
 * Privacy policy + data-deletion instructions (required by Facebook Login and Google sign-in).
 * Facts only — keep in step with supabase/migrations (personal tables, delete_my_account) and the sign-in
 * methods in D69. Contact address: NEXT_PUBLIC_CONTACT_EMAIL (optional); without it, deletion is in-app only.
 */
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";
const UPDATED = "2026-11-28";

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-8 md:py-12" data-testid="legal-page">
      <h1 className="font-display text-4xl text-forest">{title}</h1>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-charcoal/90 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-forest [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </article>
  );
}

export function PrivacyPolicy() {
  const { locale } = useT();
  if (locale === "vi") return (
    <Page title="Chính sách quyền riêng tư">
      <p className="text-sm text-muted">Cập nhật: {UPDATED}</p>
      <p>K’s Experience giúp bạn khám phá ẩm thực và trải nghiệm ở TP. Hồ Chí Minh. Bạn có thể dùng ứng dụng mà không cần tài khoản; khi đó Hộ chiếu và mục đã lưu chỉ nằm trên thiết bị của bạn.</p>
      <h2>Dữ liệu chúng tôi lưu khi bạn có tài khoản</h2>
      <ul>
        <li>Thông tin đăng nhập: email hoặc số điện thoại; nếu dùng Google/Facebook, tên và ảnh đại diện mà dịch vụ đó cung cấp.</li>
        <li>Hồ sơ: tên hiển thị, ngôn ngữ, lựa chọn riêng tư.</li>
        <li>Nội dung của bạn: món/địa điểm đã lưu, Hộ chiếu (món đã thử, nơi đã đến), ghi chú và đánh giá, sở thích ăn uống.</li>
      </ul>
      <h2>Cách chúng tôi dùng dữ liệu</h2>
      <p>Chỉ để vận hành tài khoản của bạn và đồng bộ giữa các thiết bị. Không bán dữ liệu, không quảng cáo, không dùng công cụ theo dõi hay phân tích. Người khác (kể cả biên tập viên) không xem được dữ liệu cá nhân của bạn.</p>
      <h2>Lưu trữ</h2>
      <p>Dữ liệu được lưu trên Supabase (máy chủ tại Tokyo, Nhật Bản), bảo vệ bằng phân quyền theo từng người dùng. Đăng nhập Google/Facebook và mã SMS do các nhà cung cấp đó xử lý theo chính sách của họ.</p>
      <h2>Quyền của bạn</h2>
      <p>Bạn có thể xem và sửa hồ sơ, và xóa vĩnh viễn tài khoản cùng toàn bộ dữ liệu cá nhân bất cứ lúc nào — xem <Link className="text-forest underline" href="/data-deletion/">Xóa dữ liệu</Link>.</p>
      {CONTACT && <p>Liên hệ: <a className="text-forest underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>}
    </Page>
  );
  return (
    <Page title="Privacy policy">
      <p className="text-sm text-muted">Last updated: {UPDATED}</p>
      <p>K’s Experience helps you discover food and experiences in Ho Chi Minh City. You can use it without an account; your Passport and saved items then stay on your device only.</p>
      <h2>What we store when you have an account</h2>
      <ul>
        <li>Sign-in details: your email or phone number; with Google or Facebook, the name and profile picture that service shares.</li>
        <li>Profile: display name, language, privacy choices.</li>
        <li>Your content: saved dishes and places, your Passport (dishes tried, places visited), notes and ratings, food preferences.</li>
      </ul>
      <h2>How we use it</h2>
      <p>Only to run your account and sync it across your devices. We do not sell data, show ads, or use tracking or analytics tools. Nobody else — editors included — can see your personal data.</p>
      <h2>Where it is kept</h2>
      <p>On Supabase (servers in Tokyo, Japan), protected per user. Google and Facebook sign-in and SMS codes are handled by those providers under their own policies.</p>
      <h2>Your choices</h2>
      <p>You can view and edit your profile, and permanently delete your account and all personal data at any time — see <Link className="text-forest underline" href="/data-deletion/">Data deletion</Link>.</p>
      {CONTACT && <p>Contact: <a className="text-forest underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>}
    </Page>
  );
}

export function DataDeletion() {
  const { locale } = useT();
  if (locale === "vi") return (
    <Page title="Xóa dữ liệu của bạn">
      <ol className="list-decimal space-y-2 pl-5">
        <li>Đăng nhập K’s Experience (bằng email, Google, Facebook hoặc số điện thoại bạn đã dùng).</li>
        <li>Mở <Link className="text-forest underline" href="/profile/">Hồ sơ</Link> → <b>Xóa tài khoản</b>.</li>
        <li>Gõ <b>DELETE</b> để xác nhận.</li>
      </ol>
      <p>Tài khoản và toàn bộ dữ liệu cá nhân (hồ sơ, Hộ chiếu, mục đã lưu, ghi chú, sở thích) bị xóa ngay và vĩnh viễn. Dữ liệu chỉ lưu trên thiết bị (khi dùng với tư cách khách) có thể xóa trong <Link className="text-forest underline" href="/settings/">Cài đặt</Link> → Xóa dữ liệu của tôi.</p>
      <p>Nếu bạn đã đăng nhập bằng Facebook, bạn cũng có thể gỡ K’s Experience trong cài đặt Facebook (Ứng dụng và trang web); việc này không tự xóa dữ liệu ở đây — hãy làm theo các bước trên.</p>
      {CONTACT && <p>Không đăng nhập được? Gửi email tới <a className="text-forest underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> từ email hoặc cho biết số điện thoại của tài khoản.</p>}
    </Page>
  );
  return (
    <Page title="Delete your data">
      <ol className="list-decimal space-y-2 pl-5">
        <li>Sign in to K’s Experience (with the email, Google, Facebook or phone number you used).</li>
        <li>Open <Link className="text-forest underline" href="/profile/">Profile</Link> → <b>Delete my account</b>.</li>
        <li>Type <b>DELETE</b> to confirm.</li>
      </ol>
      <p>Your account and all personal data (profile, Passport, saved items, notes, preferences) are deleted immediately and permanently. Data kept only on your device (guest use) can be cleared in <Link className="text-forest underline" href="/settings/">Settings</Link> → Reset my data.</p>
      <p>If you signed in with Facebook you can also remove K’s Experience in your Facebook settings (Apps and websites); that does not delete your data here — use the steps above.</p>
      {CONTACT && <p>Can’t sign in? Email <a className="text-forest underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> from the account’s email address, or tell us the account’s phone number.</p>}
    </Page>
  );
}
