const siteData = window.siteData;

if (!siteData) {
  throw new Error("Missing site data");
}

const $ = (selector) => document.querySelector(selector);

const setText = (selector, value) => {
  const element = $(selector);

  if (element) {
    element.textContent = value;
  }
};

const renderSummary = () => {
  const container = $("#summary-grid");

  container.innerHTML = siteData.summary
    .map(
      (item) => `
        <article class="summary-card reveal">
          <span class="summary-index">${item.index}</span>
          <h3>${item.title}</h3>
          <p>${item.body}</p>
        </article>
      `,
    )
    .join("");
};

const renderRanking = () => {
  const container = $("#ranking-list");

  container.innerHTML = siteData.ranking
    .map(
      (item) => `
        <div class="ranking-item reveal">
          <div class="ranking-no">${item.rank}</div>
          <div>
            <h3>${item.name}</h3>
            <p>${item.body}</p>
          </div>
        </div>
      `,
    )
    .join("");
};

const renderCoreVenues = () => {
  const container = $("#core-venue-grid");

  container.innerHTML = siteData.coreVenues
    .map(
      (venue) => `
        <article class="venue-card reveal" data-tilt>
          <div class="venue-topline">
            <span class="venue-tag">${venue.tag}</span>
            <span class="venue-distance">${venue.distance}</span>
          </div>
          <h3>${venue.name}</h3>
          <p class="venue-meta">${venue.meta}</p>
          <p class="venue-body">${venue.body}</p>
          <ul class="venue-list">
            ${venue.details.map((detail) => `<li>${detail}</li>`).join("")}
          </ul>
          <div class="price-band">${venue.price}</div>
        </article>
      `,
    )
    .join("");
};

const renderExpansion = () => {
  const panel = $("#expansion-update-panel");
  const board = $("#district-board");
  const districts = siteData.districtExpansion.districts;
  const newCount = siteData.districtExpansion.todayNewCount;

  panel.innerHTML = `
    <div class="update-pill">今日新增场地：${newCount}</div>
    <p>最近一次自动巡检：${siteData.meta.lastAutoScan}。扩展池会先吸收公开网页里的新线索，再按是否适合飞盘长期夜训做核验和升级。</p>
  `;

  board.innerHTML = districts
    .map(
      (district) => `
        <article class="district-card reveal">
          <div class="district-topline">
            <span class="summary-index">${district.code}</span>
            <span class="district-count">${district.venues.length} 处收录</span>
          </div>
          <h3>${district.name}</h3>
          <p class="district-intro">${district.intro}</p>
          <div class="district-list">
            ${district.venues
              .map(
                (venue) => `
                  <div class="district-item">
                    <div class="district-item-topline">
                      <span class="district-status">${venue.status}</span>
                      <a href="${venue.sourceUrl}" target="_blank" rel="noreferrer">来源</a>
                    </div>
                    <h4>${venue.name}</h4>
                    <p class="district-item-meta">${venue.address}</p>
                    <ul class="district-item-list">
                      <li>电话：${venue.phone}</li>
                      <li>${venue.price}</li>
                      <li>${venue.lighting}</li>
                      <li>订场：${venue.booking}</li>
                    </ul>
                    <p class="district-item-note">${venue.note}</p>
                  </div>
                `,
              )
              .join("")}
          </div>
        </article>
      `,
    )
    .join("");
};

const renderComparison = () => {
  const container = $("#comparison-body");

  container.innerHTML = siteData.comparison
    .map(
      (item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.phone}</td>
          <td>${item.lighting}</td>
          <td>${item.budget}</td>
          <td>${item.shower}</td>
          <td>${item.parking}</td>
          <td>${item.verdict}</td>
        </tr>
      `,
    )
    .join("");
};

const renderNotes = () => {
  const container = $("#notes-grid");

  container.innerHTML = siteData.notes
    .map(
      (item) => `
        <article class="note-card reveal">
          <h3>${item.title}</h3>
          <p>${item.body}</p>
        </article>
      `,
    )
    .join("");
};

const renderSources = () => {
  const container = $("#sources-grid");

  container.innerHTML = siteData.sources
    .map(
      (item) => `
        <a href="${item.url}" target="_blank" rel="noreferrer">
          ${item.label}
        </a>
      `,
    )
    .join("");
};

const animateCounters = () => {
  const statValues = {
    coreCount: siteData.coreVenues.length,
    priorityCount: siteData.coreVenues.filter((venue) => venue.priority).length,
    budgetLine: Number(siteData.meta.budgetLine),
  };

  const counters = document.querySelectorAll("[data-stat]");
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const element = entry.target;
        const statKey = element.dataset.stat;
        const target = Number(statValues[statKey] ?? 0);
        const duration = 1100;
        const start = performance.now();

        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          element.textContent = String(Math.round(target * eased));

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            element.textContent = String(target);
          }
        };

        requestAnimationFrame(tick);
        counterObserver.unobserve(element);
      });
    },
    { threshold: 0.45 },
  );

  counters.forEach((counter) => counterObserver.observe(counter));
};

const observeReveals = () => {
  const revealItems = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 45, 320)}ms`;
    revealObserver.observe(item);
  });
};

const initTilt = () => {
  const tiltCards = document.querySelectorAll("[data-tilt]");

  tiltCards.forEach((card) => {
    const damp = 16;

    const handleMove = (event) => {
      const bounds = card.getBoundingClientRect();
      const offsetX = event.clientX - bounds.left;
      const offsetY = event.clientY - bounds.top;
      const rotateY = ((offsetX / bounds.width) - 0.5) * damp;
      const rotateX = (0.5 - offsetY / bounds.height) * damp;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
    };

    const reset = () => {
      card.style.transform = "";
    };

    card.addEventListener("mousemove", handleMove);
    card.addEventListener("mouseleave", reset);
    card.addEventListener("blur", reset);
  });
};

const renderPage = () => {
  setText("#hero-kicker", siteData.meta.heroKicker);
  renderSummary();
  renderRanking();
  renderCoreVenues();
  renderExpansion();
  renderComparison();
  renderNotes();
  renderSources();
  observeReveals();
  animateCounters();
  initTilt();
};

renderPage();
