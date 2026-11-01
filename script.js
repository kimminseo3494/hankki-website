"use strict";

(() => {
  function init() {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => [...document.querySelectorAll(s)];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");

    /* 불필요한 안내와 조작 UI 정리 */
    $$(".marquee, .motion-control").forEach((el) => el.remove());

    const style = document.createElement("style");
    style.textContent = `
      .motion-control,
      .film-toolbar {
        display: none !important;
      }

      .rail {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .rail::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.append(style);

    /* 준비용 설명만 제거 */
    const unnecessaryText = [
      "매장명과 위치가 이곳에 표시됩니다.",
      "더바른한끼 매장의 새로운 소식을 전합니다.",
      "매장 사진과 상세 정보를 준비하고 있습니다.",
      "고객님들의 실제 후기를 소개할 공간입니다.",
      "후기와 사진을 준비하고 있습니다.",
      "실제 후기 내용과 음식 사진이 이곳에 표시됩니다."
    ];

    $$(".section-heading > p, .opening-info > p, .review-card > p")
      .forEach((el) => {
        const text = el.textContent.replace(/\s+/g, " ").trim();

        if (unnecessaryText.some((phrase) => text.includes(phrase))) {
          el.remove();
        }
      });

    /* 모바일 메뉴 */
    const nav = $("#nav");
    const hamburger = $(".hamburger");

    function closeMenu() {
      if (!nav || !hamburger) return;
      nav.classList.remove("open");
      hamburger.textContent = "☰";
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.setAttribute("aria-label", "메뉴 열기");
    }

    hamburger?.addEventListener("click", () => {
      if (!nav) return;
      const open = nav.classList.toggle("open");
      hamburger.textContent = open ? "×" : "☰";
      hamburger.setAttribute("aria-expanded", String(open));
      hamburger.setAttribute(
        "aria-label",
        open ? "메뉴 닫기" : "메뉴 열기"
      );
    });

    nav?.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("header")) closeMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    /* 등장 효과 */
    const reveals = $$(".reveal");

    if (!reduced.matches && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.08 });

      document.documentElement.classList.add("js-motion");
      reveals.forEach((el) => observer.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add("visible"));
    }

    /* 메인 사진 자동 전환 */
    const slides = $$(".hero-slides img");
    const choices = $$("[data-slide]");
    const play = $("#hero-play");

    let slideIndex = 0;
    let heroTimer = null;
    let heroAuto = true;

    function showSlide(index) {
      if (!slides.length) return;
      slideIndex = (index + slides.length) % slides.length;

      slides.forEach((img, i) => {
        img.classList.toggle("active", i === slideIndex);
      });

      choices.forEach((button) => {
        const selected = Number(button.dataset.slide) === slideIndex;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    }

    function syncHero() {
      clearInterval(heroTimer);
      heroTimer = null;

      if (
        heroAuto &&
        !reduced.matches &&
        !document.hidden &&
        slides.length > 1
      ) {
        heroTimer = setInterval(() => showSlide(slideIndex + 1), 6500);
      }

      if (play) {
        const playing = heroTimer !== null;
        play.textContent = playing ? "Ⅱ" : "▶";
        play.setAttribute("aria-pressed", String(playing));
        play.setAttribute(
          "aria-label",
          playing ? "메인 사진 자동 전환 정지" : "메인 사진 자동 전환 시작"
        );
      }
    }

    choices.forEach((button) => {
      button.addEventListener("click", () => {
        heroAuto = false;
        showSlide(Number(button.dataset.slide));
        syncHero();
      });
    });

    play?.addEventListener("click", () => {
      heroAuto = !heroAuto;
      syncHero();
    });

    /* 메뉴 자동 슬라이드 */
    const rail = $(".rail");
    const prev = $("#prev");
    const next = $("#next");

    let menuTimer = null;
    let visible = false;
    let hovered = false;
    let focused = false;
    let dragging = false;
    let lastInteraction = 0;

    function updateArrows() {
      if (!rail) return;
      const disabled = rail.scrollWidth <= rail.clientWidth + 3;
      if (prev) prev.disabled = disabled;
      if (next) next.disabled = disabled;
    }

    function moveMenu(direction) {
      const card = rail?.querySelector(".menu-item:not([hidden])");
      if (!rail || !card) return;

      const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
      if (max <= 3) return;

      const gap = parseFloat(getComputedStyle(rail).gap) || 0;
      const step = card.getBoundingClientRect().width + gap;

      const target = direction > 0
        ? rail.scrollLeft >= max - 5
          ? 0
          : Math.min(max, rail.scrollLeft + step)
        : rail.scrollLeft <= 5
          ? max
          : Math.max(0, rail.scrollLeft - step);

      rail.scrollTo({
        left: target,
        behavior: reduced.matches ? "auto" : "smooth"
      });
    }

    function syncMenu() {
      clearInterval(menuTimer);
      menuTimer = null;

      if (
        !rail ||
        !visible ||
        hovered ||
        focused ||
        dragging ||
        reduced.matches ||
        document.hidden ||
        $("dialog[open]")
      ) return;

      menuTimer = setInterval(() => {
        if (
          Date.now() - lastInteraction < 4500 ||
          $("dialog[open]")
        ) return;

        moveMenu(1);
      }, 3500);
    }

    function manualMove(direction) {
      lastInteraction = Date.now();
      moveMenu(direction);
      syncMenu();
    }

    prev?.addEventListener("click", () => manualMove(-1));
    next?.addEventListener("click", () => manualMove(1));

    rail?.addEventListener("scroll", updateArrows, { passive: true });

    rail?.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      hovered = true;
      syncMenu();
    });

    rail?.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      hovered = false;
      syncMenu();
    });

    rail?.addEventListener("focusin", () => {
      focused = true;
      syncMenu();
    });

    rail?.addEventListener("focusout", () => {
      requestAnimationFrame(() => {
        focused = rail.contains(document.activeElement);
        syncMenu();
      });
    });

    rail?.addEventListener("pointerdown", () => {
      dragging = true;
      lastInteraction = Date.now();
      syncMenu();
    });

    function releasePointer() {
      if (!dragging) return;
      dragging = false;
      lastInteraction = Date.now();
      syncMenu();
    }

    addEventListener("pointerup", releasePointer);
    addEventListener("pointercancel", releasePointer);

    rail?.addEventListener("wheel", () => {
      lastInteraction = Date.now();
    }, { passive: true });

    rail?.addEventListener("keydown", (e) => {
      if (e.target !== rail) return;
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      manualMove(e.key === "ArrowRight" ? 1 : -1);
    });

    $$("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        let count = 0;

        $$("[data-filter]").forEach((filter) => {
          filter.setAttribute("aria-pressed", String(filter === button));
        });

        $$(".menu-item").forEach((item) => {
          item.hidden =
            button.dataset.filter !== "all" &&
            item.dataset.category !== button.dataset.filter;

          if (!item.hidden) count++;
        });

        rail?.scrollTo({ left: 0, behavior: "instant" });

        const status = $(".rail-status");
        if (status) {
          status.textContent =
            `${button.textContent.trim()} 메뉴 · ${count}종`;
        }

        lastInteraction = Date.now();
        requestAnimationFrame(updateArrows);
        syncMenu();
      });
    });

    if (rail && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        syncMenu();
      }, { threshold: 0.25 });

      observer.observe(rail);
    } else {
      visible = true;
    }

    if (rail && "ResizeObserver" in window) {
      new ResizeObserver(updateArrows).observe(rail);
    }

    /* 제품 상세 */
    const products = {
      "mini-bun": {
        name: "미니 찐빵",
        food: "bun.jpg",
        front: "mini-bun-front.jpg"
      },
      "king-bun": {
        name: "왕 찐빵",
        food: "bun-large.jpg",
        front: "king-bun-front.jpg"
      },
      meat: {
        name: "수제 고기만두",
        food: "meat.jpg",
        front: "meat-front.jpg",
        back: "meat-back.jpg"
      },
      "king-meat": {
        name: "수제 고기왕만두",
        food: "king-meat.jpg",
        front: "king-meat-front.jpg",
        back: "king-meat-back.jpg"
      },
      kimchi: {
        name: "수제 김치만두",
        food: "kimchi.jpg",
        front: "kimchi-front.jpg",
        back: "kimchi-back.jpg"
      },
      "king-kimchi": {
        name: "수제 김치왕만두",
        food: "king-kimchi.jpg",
        front: "king-kimchi-front.jpg",
        back: "king-kimchi-back.jpg"
      },
      rice: {
        name: "호떡쌀군만두",
        food: "rice.jpg",
        front: "rice-front.jpg",
        back: "rice-back.jpg"
      },
      "rice-kimchi": {
        name: "호떡쌀김치군만두",
        food: "rice-kimchi.jpg",
        front: "rice-kimchi-front.jpg",
        back: "rice-kimchi-back.jpg"
      },
      galbi: {
        name: "숯불 갈비만두",
        food: "galbi.jpg"
      }
    };

    const productDialog = $("#product-dialog");
    const productImage = $("#product-image");
    const tabs = $$("[data-side]");

    let currentProduct = null;
    let trigger = null;

    function showProductSide(side) {
      const product = products[currentProduct];
      if (!product?.[side] || !productImage) return;

      const names = {
        food: "음식 사진",
        front: "포장 앞면",
        back: "제품 표시사항"
      };

      productImage.src = `./assets/${product[side]}`;
      productImage.alt = `${product.name} ${names[side]}`;

      tabs.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.side === side)
        );
      });
    }

    $$("[data-product]").forEach((button) => {
      button.addEventListener("click", () => {
        const product = products[button.dataset.product];
        if (!product || !productDialog) return;

        currentProduct = button.dataset.product;
        trigger = button;

        $("#product-title").textContent = product.name;
        $("#product-description").textContent =
          button.closest(".menu-item")
            ?.querySelector(":scope > span")?.textContent || "";

        tabs.forEach((tab) => {
          tab.hidden = !product[tab.dataset.side];
        });

        showProductSide("food");
        if (!productDialog.open) productDialog.showModal();
        syncMenu();
      });
    });

    tabs.forEach((button) => {
      button.addEventListener("click", () => {
        showProductSide(button.dataset.side);
      });
    });

    $(".product-close")?.addEventListener("click", () => {
      productDialog?.close();
    });

    productDialog?.addEventListener("close", () => {
      trigger?.focus({ preventScroll: true });
      syncMenu();
    });

    /* 문의 폼 미리보기 */
    const form = $("#contact form");
    const inquiry = $("#inquiry-dialog");

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const status = $("#status");
      if (status) {
        status.textContent =
          "상담 신청은 전송되지 않았습니다. 전화로 문의해 주세요.";
      }

      if (inquiry && !inquiry.open) inquiry.showModal();
      syncMenu();
    });

    $(".close-dialog")?.addEventListener("click", () => inquiry?.close());

    inquiry?.addEventListener("close", syncMenu);

    [productDialog, inquiry].forEach((dialog) => {
      if (!dialog) return;
      let startedOutside = false;

      function outside(e) {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left || e.clientX > r.right ||
          e.clientY < r.top || e.clientY > r.bottom
        );
      }

      dialog.addEventListener("pointerdown", (e) => {
        startedOutside = e.target === dialog && outside(e);
      });

      dialog.addEventListener("click", (e) => {
        if (startedOutside && e.target === dialog && outside(e)) {
          dialog.close();
        }
        startedOutside = false;
      });
    });

    /* 스크롤 효과 */
    const header = $("header");
    const stage = $(".hero-stage");
    const hero = $(".hero");

    const progress = document.createElement("div");
    progress.className = "scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.prepend(progress);

    let frame = null;

    function updateScroll() {
      frame = null;
      header?.classList.toggle("scrolled", scrollY > 30);

      const range = document.documentElement.scrollHeight - innerHeight;
      const amount = range > 0
        ? Math.min(1, Math.max(0, scrollY / range))
        : 0;

      progress.style.setProperty("--scroll-progress", String(amount));

      if (!stage || !hero) return;

      const height = hero.getBoundingClientRect().height;
      const covered = Math.min(
        1,
        Math.max(0, -stage.getBoundingClientRect().top / Math.max(height, 1))
      );

      hero.style.setProperty(
        "--cover-dim",
        reduced.matches ? "0" : String(covered * 0.48)
      );

      hero.style.setProperty(
        "--cover-scale",
        reduced.matches ? "1" : String(1 - covered * 0.045)
      );
    }

    function requestScrollUpdate() {
      if (frame !== null) return;
      frame = requestAnimationFrame(updateScroll);
    }

    addEventListener("scroll", requestScrollUpdate, { passive: true });

    addEventListener("resize", () => {
      if (innerWidth > 800) closeMenu();
      updateArrows();
      requestScrollUpdate();
    });

    addEventListener("load", () => {
      updateArrows();
      requestScrollUpdate();
    });

    document.addEventListener("visibilitychange", () => {
      syncHero();
      syncMenu();
    });

    reduced.addEventListener("change", () => {
      if (reduced.matches) {
        reveals.forEach((el) => el.classList.add("visible"));
      }
      syncHero();
      syncMenu();
      requestScrollUpdate();
    });

    showSlide(0);
    syncHero();
    syncMenu();
    updateArrows();
    updateScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();