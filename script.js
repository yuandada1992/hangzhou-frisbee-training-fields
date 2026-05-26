const SHEET_ID = "1Yg4RlTk9MIoebHswOScZGqcUfN3XJGMpTqgUOCcE9Sw";
const SHEET_GID = "0";
const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
const SHEET_RANGE = "A1:I999";
const SHEET_GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${SHEET_GID}&range=${encodeURIComponent(
  SHEET_RANGE,
)}&headers=1&tqx=out:json`;

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

const readCellValue = (cell) => {
  if (!cell) {
    return "";
  }

  if (typeof cell.f === "string" && cell.f.trim()) {
    return cell.f;
  }

  if (cell.v === null || cell.v === undefined) {
    return "";
  }

  return String(cell.v);
};

const gvizToRecords = (response) => {
  const table = response?.table;
  const headers = (table?.cols || []).map((col) => col.label || "");
  const rows = table?.rows || [];

  return rows
    .map((row) =>
      columns.reduce((record, column) => {
        const index = headers.indexOf(column);
        record[column] = index >= 0 ? readCellValue(row.c?.[index]) : "";
        return record;
      }, {}),
    )
    .filter((record) => record["场地名称"]);
};

const loadSheet = () =>
  new Promise((resolve, reject) => {
    const scriptId = "sheet-gviz-loader";
    const previous = document.getElementById(scriptId);
    if (previous) {
      previous.remove();
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `${SHEET_GVIZ_URL}&_=${Date.now()}`;
    script.async = true;

    const cleanup = () => {
      script.remove();
      window.google = undefined;
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Failed to load Google visualization data"));
    };

    window.google = {
      visualization: {
        Query: {
          setResponse: (response) => {
            cleanup();
            resolve(gvizToRecords(response));
          },
        },
      },
    };

    document.body.appendChild(script);
  });

const refreshTable = async () => {
  try {
    const records = await loadSheet();
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

refreshTable();
