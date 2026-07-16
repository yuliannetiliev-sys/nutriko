import { getSiteSettings, listContactMessages } from "@/lib/data";
import SiteSettingsForm from "./SiteSettingsForm";
import MessagesList from "./MessagesList";
import ChangePassword from "./ChangePassword";

export const dynamic = "force-dynamic";

export default async function SitePage() {
  const [settings, messages] = await Promise.all([getSiteSettings(), listContactMessages()]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold">Сайт — съдържание</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Редактирай текстовете и контактите на публичния сайт. Промените са веднага live.
        </p>
        <SiteSettingsForm settings={settings} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Съобщения <span className="text-neutral-400">· {messages.length}</span>
        </h2>
        <MessagesList messages={messages} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Достъп</h2>
        <ChangePassword />
      </section>
    </div>
  );
}
