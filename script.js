const SHEET_ID = "1Yg4RlTk9MIoebHswOScZGqcUfN3XJGMpTqgUOCcE9Sw";
const SHEET_GID = "0";
const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const columns = [
  "场地名称",
  "地址",
  "联系电话",
  "资料来源链接",
  "是否可租赁",
  "价格",
  "备注",
  "跟进人",
  "联系人",
];

const tableBody = document.querySelector("#table-body");
const syncStatus = document.querySelector("#sync-status");
const updatedAt = document.querySelector("#updated-at");
const editLink = document.querySelector("#edit-link");
const sheetLink = document.querySelector("#sheet-link");

editLink.href = SHEET_EDIT_URL;
sheetLink.href = SHEET_EDIT_URL;

const parseCsv = (text) => {
  const rows = [];
  let current = "";
  let row = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"") {
      if (quoted && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
};

const escapeHtml = (value = "") =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");

const renderRows = (records) => {
  if (!records.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="placeholder">协作表里暂时还没有可显示的数据。</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = records
    .map((record) => {
      const source = record["资料来源链接"] || "";
      const sourceCell = source
        ? `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">打开来源</a>`
        : "";

      return `
        <tr>
          <td>${escapeHtml(record["场地名称"] || "")}</td>
          <td>${escapeHtml(record["地址"] || "")}</td>
          <td class="phone">${escapeHtml(record["联系电话"] || "")}</td>
          <td>${sourceCell}</td>
          <td>${escapeHtml(record["是否可租赁"] || "")}</td>
          <td>${escapeHtml(record["价格"] || "")}</td>
          <td>${escapeHtml(record["备注"] || "")}</td>
          <td>${escapeHtml(record["跟进人"] || "")}</td>
          <td>${escapeHtml(record["联系人"] || "")}</td>
        </tr>
      `;
    })
    .join("");
};

const loadSheet = async () => {
  try {
    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status}`);
    }

    const csv = await response.text();
    const rows = parseCsv(csv).filter((row) => row.some((cell) => cell.trim() !== ""));
    const header = rows[0] || [];
    const body = rows.slice(1);

    const records = body
      .map((row) =>
        columns.reduce((record, column) => {
          const index = header.indexOf(column);
          record[column] = index >= 0 ? row[index] || "" : "";
          return record;
        }, {}),
      )
      .filter((record) => record["场地名称"]);

    renderRows(records);
    syncStatus.textContent = "协作表数据已同步";
    updatedAt.textContent = `最后同步：${new Date().toLocaleString("zh-CN", {
      hour12: false,
    })}`;
  } catch (error) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="placeholder">
          现在还没拿到协作表公开数据。先点上方“手机端直接编辑”进入协作表查看或修改。
        </td>
      </tr>
    `;
    syncStatus.textContent = "协作表暂时未公开读取";
    updatedAt.textContent = "最后同步：读取失败";
    console.error(error);
  }
};

loadSheet();
