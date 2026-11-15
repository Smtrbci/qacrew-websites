(() => {
  "use strict";

  const catalog = {
    starter: { monthly: { id: "pri_01m7dt0d4kfckn1es9602kak1g", USD: 9, EUR: 8, TRY: 149 }, yearly: { id: "pri_01m7dt0dbeye1gdctcsz6taafy", USD: 90, EUR: 80, TRY: 1490 } },
    pro: { monthly: { id: "pri_01m7dt0dy77cjwdhnq15r41v2w", USD: 29, EUR: 25, TRY: 499 }, yearly: { id: "pri_01m7dt0e5zdvwwa9k4498ysnfx", USD: 290, EUR: 250, TRY: 4990 } },
    team: { monthly: { id: "pri_01m7dt0enhx9qx29gvmvbztrac", USD: 79, EUR: 69, TRY: 1399 }, yearly: { id: "pri_01m7dt0ewra0mj0ar69x34ndw0", USD: 790, EUR: 690, TRY: 13990 } }
  };
  const copy = {
    tr: {
      ready: "Sandbox hazır. Test işlemi başlatılabilir.",
      disabled: "Ödeme testi henüz etkin değil. Cloudflare’da Sandbox istemci anahtarı yapılandırılmalı.",
      unsafe: "Güvenlik nedeniyle yalnızca Paddle Sandbox test anahtarları kabul edilir.",
      sdk: "Paddle ödeme kütüphanesi yüklenemedi. Sayfayı yenileyip tekrar dene.",
      config: "Ödeme yapılandırması okunamadı. Bir süre sonra tekrar dene.",
      login: "Ödemeyi hesabına bağlamak için Forge’a giriş yap. Demo hesabı ödeme başlatamaz.",
      intent: "Hesap doğrulaması yapılamadı. Girişini kontrol edip tekrar dene.",
      launch: "Güvenli ödeme testini başlat",
      starting: "Ödeme penceresi hazırlanıyor…",
      checkout: "Paddle ödeme penceresi açılamadı. Tekrar deneyin."
    },
    en: {
      ready: "Sandbox is ready. You can start a test checkout.",
      disabled: "Checkout is not enabled yet. Configure the Paddle Sandbox client token in Cloudflare.",
      unsafe: "For security, only Paddle Sandbox tokens are accepted.",
      sdk: "Paddle.js could not be loaded. Refresh and try again.",
      config: "Could not load payment configuration. Try again shortly.",
      login: "Sign in to Forge to link checkout to your account. Demo accounts cannot start checkout.",
      intent: "Your account could not be verified. Check your sign-in and try again.",
      launch: "Start secure checkout test",
      starting: "Preparing checkout…",
      checkout: "Could not open Paddle Checkout. Try again.",
      back: "← Back to pricing", eyebrow: "Paddle Sandbox · Checkout test", subtitle: "Enter payment details in Paddle’s secure checkout, not on Forge servers. Sandbox does not charge real money.",
      tax: "Tax and the final local price are shown in Paddle Checkout.", step1: "The Sandbox payment form opens.", step2: "A subscription is created with a test payment method.", step3: "The result appears under Transactions in Paddle Sandbox.",
      trust: "Plan access is enabled only after a signed Paddle webhook links the subscription to your account.", loginLink: "Sign in / Return to Forge"
    }
  };

  const params = new URLSearchParams(location.search);
  const plan = catalog[params.get("plan")] ? params.get("plan") : "pro";
  const period = params.get("period") === "yearly" ? "yearly" : "monthly";
  const currency = ["USD", "EUR", "TRY"].includes(params.get("currency")) ? params.get("currency") : "TRY";
  const symbol = { USD: "$", EUR: "€", TRY: "₺" }[currency];
  const labels = { starter: "Starter", pro: "Pro", team: "Team" };
  const limits = { starter: 50, pro: 250, team: 1000 };
  const seats = { starter: 1, pro: 1, team: 5 };
  const selection = catalog[plan][period];
  const state = document.querySelector("#state");
  const button = document.querySelector("#start-checkout");
  let currentState = "";
  let language = "tr";
  try { language = localStorage.getItem("qs-language") || (localStorage.getItem("qs-lang") === "1" ? "en" : "tr"); } catch {}
  if (!copy[language]) language = "tr";

  function setState(key, error = false) {
    currentState = key;
    state.classList.toggle("error", error);
    state.textContent = copy[language][key];
  }
  function updateLabels() {
    document.documentElement.lang = language;
    document.querySelector(".lang").textContent = language === "tr" ? "EN" : "TR";
    document.querySelector("#plan-name").textContent = labels[plan];
    document.querySelector("#period-name").textContent = period === "monthly" ? (language === "tr" ? "Aylık" : "Monthly") : (language === "tr" ? "Yıllık" : "Yearly");
    document.querySelector("#price").textContent = `${symbol}${selection[currency].toLocaleString(language === "tr" ? "tr-TR" : "en-US")} / ${period === "monthly" ? (language === "tr" ? "ay" : "month") : (language === "tr" ? "yıl" : "year")}`;
    document.querySelector("#included").textContent = language === "tr" ? `Ayda ${limits[plan].toLocaleString("tr-TR")} üretim · ${seats[plan]} kullanıcı${plan === "team" ? " koltuğu" : ""}` : `${limits[plan].toLocaleString("en-US")} generations/month · ${seats[plan]} ${seats[plan] === 1 ? "user" : "seats"}`;
    document.querySelector("#trial").textContent = plan === "team" ? (language === "tr" ? "Bu pakette ücretsiz deneme yok." : "No free trial for this plan.") : (language === "tr" ? "7 gün ücretsiz deneme (Paddle fiyat yapılandırmasına bağlıdır)." : "7-day free trial (subject to Paddle price configuration). ");
    document.querySelector(".checkout h1").textContent = language === "tr" ? "Aboneliğini test et" : "Test your subscription";
    document.querySelectorAll(".box h2")[0].textContent = language === "tr" ? "Sipariş özeti" : "Order summary";
    document.querySelectorAll(".box h2")[1].textContent = language === "tr" ? "Test akışı" : "Test flow";
    document.querySelector(".checkout>p").textContent = language === "tr" ? "Kart bilgilerini Forge sunucusuna değil, Paddle’ın güvenli ödeme penceresine girersin. Sandbox modunda gerçek tahsilat yapılmaz." : copy.en.subtitle;
    document.querySelector(".checkout .eyebrow").textContent = language === "tr" ? "Paddle Sandbox · Ödeme testi" : copy.en.eyebrow;
    document.querySelector(".top nav a").textContent = language === "tr" ? "← Fiyatlara dön" : copy.en.back;
    document.querySelectorAll(".summary>div")[4].textContent = language === "tr" ? "Vergi ve kesin yerel fiyat Paddle ödeme ekranında gösterilir." : copy.en.tax;
    document.querySelectorAll(".summary li")[0].textContent = language === "tr" ? "Sandbox ödeme formu açılır." : copy.en.step1;
    document.querySelectorAll(".summary li")[1].textContent = language === "tr" ? "Test ödeme yöntemiyle abonelik işlemi oluşturulur." : copy.en.step2;
    document.querySelectorAll(".summary li")[2].textContent = language === "tr" ? "Sonuç, Paddle Sandbox panelindeki Transactions bölümünde görünür." : copy.en.step3;
    document.querySelector(".box .muted").textContent = language === "tr" ? "Ödeme sonrası paket erişimi yalnızca imzası doğrulanmış Paddle webhook’u hesabına bağladığında etkinleşir." : copy.en.trust;
    document.querySelector(".login-link").textContent = language === "tr" ? "Giriş yap / Forge hesabına dön" : copy.en.loginLink;
    button.textContent = copy[language].launch;
    if (currentState) state.textContent = copy[language][currentState];
  }
  updateLabels();
  document.querySelector(".lang").addEventListener("click", () => { language = language === "tr" ? "en" : "tr"; updateLabels(); });

  fetch("/api/billing/config", { credentials: "same-origin", cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then(async (config) => {
      if (!config.enabled || !config.token) { setState("disabled", true); return; }
      if (!config.token.startsWith("test_")) { setState("unsafe", true); return; }
      if (!window.Paddle) { setState("sdk", true); return; }
      let sessionResponse;
      try { sessionResponse = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" }); }
      catch { setState("intent", true); return; }
      if (!sessionResponse.ok) { setState("login", true); return; }
      const session = await sessionResponse.json();
      if (!session.user || session.user.demo) { setState("login", true); return; }
      Paddle.Environment.set("sandbox");
      Paddle.Initialize({ token: config.token, eventCallback: (event) => {
        if (event?.name !== "checkout.completed") return;
        const transactionId = event.data?.transaction_id;
        if (typeof transactionId === "string" && /^txn_[a-z\d]{20,40}$/i.test(transactionId)) {
          const url = new URL("/forge/checkout/success/", location.origin);
          url.searchParams.set("txn", transactionId);
          url.searchParams.set("plan", plan);
          location.assign(url.toString());
        }
      } });
      button.disabled = false;
      setState("ready");
    })
    .catch(() => setState("config", true));

  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    setState("starting");
    try {
      const response = await fetch("/api/billing/checkout-intent", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, period })
      });
      if (!response.ok) { setState(response.status === 401 ? "login" : "intent", true); button.disabled = response.status !== 401; return; }
      const { customData } = await response.json();
      Paddle.Checkout.open({ items: [{ priceId: selection.id, quantity: 1 }], customData });
      setState("ready");
    } catch {
      setState("checkout", true);
      button.disabled = false;
    }
  });
})();
