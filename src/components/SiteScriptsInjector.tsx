import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/use-site-settings";

const COOKIE_KEY = "revmed-cookie-consent";

function hasConsent() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE_KEY}=accepted`));
}

function injectScript(id: string, src?: string, inline?: string) {
  if (typeof document === "undefined") return;
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  if (src) s.src = src;
  if (inline) s.innerHTML = inline;
  document.head.appendChild(s);
}

function injectRawHTML(id: string, html: string, target: "head" | "body") {
  if (typeof document === "undefined") return;
  if (document.getElementById(id)) return;
  const wrapper = document.createElement("div");
  wrapper.id = id;
  wrapper.style.display = "none";
  wrapper.innerHTML = html;
  (target === "head" ? document.head : document.body).appendChild(wrapper);
}

export function SiteScriptsInjector() {
  const { settings } = useSiteSettings();

  // Apply colors as CSS variables
  useEffect(() => {
    if (!settings?.colors) return;
    const root = document.documentElement;
    const map: Record<string, string> = {
      primary: "--primary",
      mint: "--mint",
      accent: "--accent",
      background: "--background",
    };
    Object.entries(settings.colors).forEach(([key, value]) => {
      const cssVar = map[key];
      if (cssVar && value) root.style.setProperty(cssVar, value);
    });
  }, [settings?.colors]);

  // Inject tracking pixels (only if user consented)
  useEffect(() => {
    if (!settings) return;
    if (!hasConsent()) return;

    const { fb_pixel_id, tiktok_pixel_id, ga4_id, gtm_id, custom_head_html, custom_body_html } = settings;

    if (gtm_id) {
      injectScript(
        "gtm-script",
        undefined,
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm_id}');`
      );
    }
    if (ga4_id) {
      injectScript("ga4-loader", `https://www.googletagmanager.com/gtag/js?id=${ga4_id}`);
      injectScript("ga4-init", undefined, `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4_id}');`);
    }
    if (fb_pixel_id) {
      injectScript(
        "fb-pixel",
        undefined,
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fb_pixel_id}');fbq('track','PageView');`
      );
    }
    if (tiktok_pixel_id) {
      injectScript(
        "tiktok-pixel",
        undefined,
        `!function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tiktok_pixel_id}');ttq.page();}(window, document, 'ttq');`
      );
    }
    if (custom_head_html) injectRawHTML("custom-head-html", custom_head_html, "head");
    if (custom_body_html) injectRawHTML("custom-body-html", custom_body_html, "body");
  }, [settings]);

  return null;
}