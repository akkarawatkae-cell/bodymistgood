/* ==========================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

(function () {
  "use strict";

  /* ---------- ค่าคงที่ ---------- */
  var ORDER_API_URL =
    "https://script.google.com/macros/s/AKfycbxpNGW5pbKvspB2IDvSntAzxGESREycTbiEgbrPF30br3fxEBDv_mlmVdLYw4lAnv6jTQ/exec";

  var ORDERS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT0UBChJAHAi_0TIb1-LT10BsoUybCzyPQrmFUQcRMoJEHyy40XCcjYBWlYMuJGACqzWpZcXNV3D4Wj/pub?gid=0&single=true&output=csv";

  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  /* ---------- helper ---------- */
  function $(selector) {
    return document.querySelector(selector);
  }

  function formatPrice(n) {
    return Number(n).toLocaleString("th-TH");
  }

  function moodLabel(key) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].key === key) return MOODS[i].label;
    }
    return key;
  }

  /* ==========================================================
     1) หน้า product.html
     ========================================================== */
  function initProductPage() {
    var filterBar = $("#filter-bar");
    var list = $("#product-list");
    if (!filterBar || !list) return;

    var products = [];
    var params = new URLSearchParams(window.location.search);
    var initialMood = (params.get("mood") || "all").toLowerCase();
    var validMood = MOODS.some(function (m) { return m.key === initialMood; });
    var currentMood = validMood ? initialMood : "all";

    function renderFilterBar() {
      filterBar.innerHTML = "";
      MOODS.forEach(function (m) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filter-btn" + (m.key === currentMood ? " is-active" : "");
        btn.textContent = m.label;
        btn.setAttribute("data-mood", m.key);
        btn.setAttribute("aria-pressed", m.key === currentMood ? "true" : "false");
        btn.addEventListener("click", function () {
          currentMood = m.key;
          renderFilterBar();
          renderProducts();
          updateUrl();
        });
        filterBar.appendChild(btn);
      });
    }

    function updateUrl() {
      if (!window.history || !window.history.replaceState) return;
      var url = new URL(window.location.href);
      if (currentMood === "all") {
        url.searchParams.delete("mood");
      } else {
        url.searchParams.set("mood", currentMood);
      }
      window.history.replaceState(null, "", url.toString());
    }

    function buildCard(p) {
      var card = document.createElement("article");
      card.className = "card";

      var media = document.createElement("div");
      media.className = "card__media";
      var img = document.createElement("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      media.appendChild(img);

      var body = document.createElement("div");
      body.className = "card__body";

      var mood = document.createElement("span");
      mood.className = "mood-dot mood-" + p.mood;
      mood.textContent = moodLabel(p.mood);

      var title = document.createElement("h3");
      title.className = "card__title";
      title.textContent = p.name;

      var meta = document.createElement("div");
      meta.className = "card__meta";

      var size = document.createElement("span");
      size.className = "size";
      size.textContent = p.size || (p.type === "rollon" ? "โรลออน" : "");

      var price = document.createElement("span");
      price.className = "price";
      price.textContent = formatPrice(p.price);
      var unit = document.createElement("small");
      unit.textContent = "บาท";
      price.appendChild(unit);

      meta.appendChild(size);
      meta.appendChild(price);

      var orderLink = document.createElement("a");
      orderLink.className = "btn btn--small";
      orderLink.textContent = "สั่งซื้อ";
      var q = new URLSearchParams();
      q.set("item", p.name);
      q.set("price", String(p.price));
      orderLink.href = "order.html?" + q.toString();
      orderLink.style.marginTop = "1.5rem";
      orderLink.style.textAlign = "center";

      body.appendChild(mood);
      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(orderLink);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function renderProducts() {
      list.innerHTML = "";
      var shown = products.filter(function (p) {
        return currentMood === "all" || p.mood === currentMood;
      });

      if (shown.length === 0) {
        var empty = document.createElement("p");
        empty.textContent = "ไม่พบสินค้าในหมวดนี้";
        list.appendChild(empty);
        return;
      }
      shown.forEach(function (p) { list.appendChild(buildCard(p)); });
    }

    renderFilterBar();

    fetch("products.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        renderProducts();
      })
      .catch(function (error) {
        console.error(error);
        list.innerHTML = "";
        var msg = document.createElement("p");
        msg.textContent = "ไม่สามารถโหลดรายการสินค้าได้ กรุณารีเฟรชหน้านี้อีกครั้ง";
        list.appendChild(msg);
      });
  }

  /* ==========================================================
     2) หน้า order.html
     ========================================================== */
  function initOrderPage() {
    var form = $("#orderForm");
    if (!form) return;

    var itemsInput = $("#items");
    var totalInput = $("#total");

    // อ่านค่าจาก URL แล้วเติมลงฟอร์มทันที (ทั้ง items และ total)
    var params = new URLSearchParams(window.location.search);
    var item = params.get("item");
    var price = params.get("price");
    if (itemsInput && item) itemsInput.value = item;
    if (totalInput && price) totalInput.value = price;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }

      var payload = {
        customerName: $("#customerName").value.trim(),
        contact: $("#contact").value.trim(),
        items: $("#items").value.trim(),
        total: $("#total").value.trim(),
        note: $("#note") ? $("#note").value.trim() : ""
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(ORDER_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* ==========================================================
     3) หน้า admin.html
     ========================================================== */

  // parse CSV เอง: รองรับเครื่องหมายคำพูด, เครื่องหมาย "" ซ้อน, คอมมาและขึ้นบรรทัดใหม่ในช่อง
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);

      if (inQuotes) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text.charAt(i + 1) === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }

    // แถวสุดท้ายที่ไม่มีขึ้นบรรทัดใหม่ปิดท้าย
    if (field !== "" || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    // ตัดแถวว่าง
    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ""; });
    });
  }

  function initAdminPage() {
    var tbody = $("#ordersTable tbody");
    if (!tbody) return;

    var COLS = 6; // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ

    function showMessage(text) {
      tbody.innerHTML = "";
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = COLS;
      td.textContent = text;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage("กำลังโหลดข้อมูล...");

    fetch(ORDERS_CSV_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);
        rows.shift(); // แถวแรกคือหัวคอลัมน์

        if (rows.length === 0) {
          showMessage("ยังไม่มีรายการสั่งซื้อ");
          return;
        }

        // ชีตเพิ่มแถวใหม่ต่อท้ายเสมอ จึงกลับลำดับให้รายการล่าสุดขึ้นก่อน
        rows.reverse();

        tbody.innerHTML = "";
        rows.forEach(function (r) {
          var tr = document.createElement("tr");
          for (var i = 0; i < COLS; i++) {
            var td = document.createElement("td");
            td.textContent = (r[i] || "").trim();
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showMessage("ไม่สามารถโหลดข้อมูลได้ กรุณารีเฟรชหน้านี้อีกครั้ง");
      });
  }

  /* ---------- เริ่มทำงาน ---------- */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
