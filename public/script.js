const SPREADSHEET_ID = '1hT4izyWGoqklc5CAfqb66i0r5p5PaiuKxXMrqEO_EaI';
const API_KEY = 'AIzaSyA9g2qFUolpsu3_HVHOebdZb0NXnQgXlFM';
const RANGE_MAIN = '02_01_ke_hoach!A:T';
const RANGE_DETAIL = '02_02_ke_hoach_chi_tiet!A:R';

let planState = {
    mainTasks: [],
    detailTasks: []
};

function loadGapiAndInitialize() {
    if (window.gapi) {
        initialize();
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = initialize;
    script.onerror = () => showStatus('Không tải được Google API Client.');
    document.body.appendChild(script);
}

function initialize() {
    gapi.load('client', async () => {
        try {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });

            await loadPlanData();
        } catch (error) {
            console.error(error);
            showStatus(`Lỗi khởi tạo: ${error.message}`);
        }
    });
}

async function loadPlanData() {
    try {
        showStatus('Đang tải dữ liệu kế hoạch...');

        const [mainRows, detailRows] = await Promise.all([
            fetchSheetRows(RANGE_MAIN),
            fetchSheetRows(RANGE_DETAIL)
        ]);

        planState.mainTasks = parseMainTasks(mainRows);
        planState.detailTasks = parseDetailTasks(detailRows);

        renderPlanPage();
        showStatus(`Đã tải ${planState.mainTasks.length} nhiệm vụ chủ chốt và ${planState.detailTasks.length} nhiệm vụ chi tiết.`);
    } catch (error) {
        console.error(error);
        showStatus(`Không thể tải dữ liệu: ${error.message}`);
    }
}

async function fetchSheetRows(range) {
    const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range
    });

    const rows = response.result.values || [];
    return rows;
}

function normalizeRows(rows, headerName) {
    if (!Array.isArray(rows)) return [];
    const cleanRows = rows
        .filter(row => Array.isArray(row) && row.some(cell => String(cell ?? '').trim() !== ''));

    if (!cleanRows.length) return [];

    const firstCell = String(cleanRows[0][0] ?? '').trim().toLowerCase();
    if (firstCell === headerName.toLowerCase()) {
        return cleanRows.slice(1);
    }
    return cleanRows;
}

function parseMainTasks(rows) {
    return normalizeRows(rows, 'ma_nhiem_vu').map(row => ({
        ma_nhiem_vu: valueAt(row, 0),
        nguoi_tao: valueAt(row, 1),
        ngay_tao: valueAt(row, 2),
        du_an: valueAt(row, 3),
        giai_doan: valueAt(row, 4),
        nhom_nhiem_vu: valueAt(row, 5),
        thu_tu_nhiem_vu: valueAt(row, 6),
        ten_nhiem_vu: valueAt(row, 7),
        mo_ta: valueAt(row, 8),
        muc_tieu: valueAt(row, 9),
        do_uu_tien: valueAt(row, 10),
        nguoi_phu_trach: valueAt(row, 11),
        phong_ban_phoi_hop: valueAt(row, 12),
        ngay_bat_dau: valueAt(row, 13),
        han_hoan_thanh: valueAt(row, 14),
        trang_thai: valueAt(row, 15),
        ti_le_hoan_thanh: valueAt(row, 16),
        ngay_hoan_thanh_thuc_te: valueAt(row, 17),
        ngay_cap_nhat: valueAt(row, 18),
        lich_su: valueAt(row, 19)
    }));
}

function parseDetailTasks(rows) {
    return normalizeRows(rows, 'ma_nhiem_vu_chi_tiet').map(row => ({
        ma_nhiem_vu_chi_tiet: valueAt(row, 0),
        ma_nhiem_vu_id: valueAt(row, 1),
        thu_tu_nhiem_vu_chi_tiet: valueAt(row, 2),
        ten_nhiem_vu_chi_tiet: valueAt(row, 3),
        mo_ta_chi_tiet: valueAt(row, 4),
        dau_ra_can_dat: valueAt(row, 5),
        nguoi_phu_trach: valueAt(row, 6),
        nguoi_phoi_hop: valueAt(row, 7),
        thoi_gian_bat_dau: valueAt(row, 8),
        deadline_du_kien: valueAt(row, 9),
        muc_do_uu_tien: valueAt(row, 10),
        trang_thai: valueAt(row, 11),
        ngay_hoan_thanh_thuc_te: valueAt(row, 12),
        xac_nhan_hoan_thanh: valueAt(row, 13),
        rui_ro_chinh: valueAt(row, 14),
        ly_do_tre: valueAt(row, 15),
        ghi_chu: valueAt(row, 16),
        lich_su: valueAt(row, 17)
    }));
}

function valueAt(row, index) {
    return row && row[index] != null ? String(row[index]).trim() : '';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showStatus(message) {
    const el = document.getElementById('statusBox');
    if (el) el.textContent = message;
}

function renderPlanPage() {
    const { mainTasks, detailTasks } = planState;

    document.getElementById('pageTitle').textContent = getPageTitle(mainTasks);
    document.getElementById('pageSubtitle').innerHTML = getPageSubtitle(mainTasks);

    renderSummary(mainTasks, detailTasks);
    renderBlocks(mainTasks, detailTasks);
}

function getPageTitle(mainTasks) {
    const projects = uniqueValues(mainTasks.map(item => item.du_an).filter(Boolean));
    if (projects.length === 1) return `Kế hoạch dự án: ${projects[0]}`;
    if (projects.length > 1) return 'Kế hoạch nhiều dự án';
    return 'Kế hoạch nhiệm vụ';
}

function getPageSubtitle(mainTasks) {
    const projects = uniqueValues(mainTasks.map(item => item.du_an).filter(Boolean));
    const phases = uniqueValues(mainTasks.map(item => item.giai_doan).filter(Boolean));
    const countText = `${mainTasks.length} nhiệm vụ chủ chốt`;
    const projectText = projects.length ? `Dự án: ${escapeHtml(projects.join(', '))}` : 'Chưa có tên dự án';
    const phaseText = phases.length ? `Giai đoạn: ${escapeHtml(phases.join(', '))}` : 'Chưa có giai đoạn';
    return `${projectText} · ${phaseText} · ${countText}`;
}

function uniqueValues(arr) {
    return [...new Set(arr.map(item => String(item).trim()).filter(Boolean))];
}

function renderSummary(mainTasks, detailTasks) {
    const summaryGrid = document.getElementById('summaryGrid');
    const mainCompleted = mainTasks.filter(item => normalizeStatus(item.trang_thai) === 'hoàn thành').length;
    const detailCompleted = detailTasks.filter(item => normalizeStatus(item.trang_thai) === 'hoàn thành').length;
    const inProgress = [...mainTasks, ...detailTasks].filter(item => {
        const status = normalizeStatus(item.trang_thai);
        return status && status.includes('thực hiện');
    }).length;
    const late = [...mainTasks, ...detailTasks].filter(item => isOverdue(item)).length;

    summaryGrid.innerHTML = [
        summaryCard('Nhiệm vụ chủ chốt', mainTasks.length, 'Tổng số nhiệm vụ cấp 1'),
        summaryCard('Nhiệm vụ chi tiết', detailTasks.length, 'Tổng số đầu việc cấp 2'),
        summaryCard('Đã hoàn thành', `${mainCompleted + detailCompleted}`, 'Tính theo trạng thái “Hoàn thành”'),
        summaryCard('Đang thực hiện / Quá hạn', `${inProgress} / ${late}`, 'Gồm các nhiệm vụ còn mở')
    ].join('');
}

function summaryCard(label, value, note) {
    return `
        <article class="summary-card">
            <p class="summary-label">${escapeHtml(label)}</p>
            <p class="summary-value">${escapeHtml(value)}</p>
            <p class="summary-note">${escapeHtml(note)}</p>
        </article>
    `;
}

function renderBlocks(mainTasks, detailTasks) {
    const container = document.getElementById('planContainer');
    const filteredMainTasks = mainTasks
        .slice()
        .sort((a, b) => compareNumber(a.thu_tu_nhiem_vu, b.thu_tu_nhiem_vu));

    const detailMap = groupDetailsByParent(detailTasks);

    if (!filteredMainTasks.length) {
        container.innerHTML = `<div class="status-box">Không tìm thấy dữ liệu trong sheet 02_01_ke_hoach.</div>`;
        return;
    }

    container.innerHTML = filteredMainTasks.map(mainTask => renderMainTaskBlock(mainTask, detailMap.get(mainTask.ma_nhiem_vu) || [])).join('');
}

function compareNumber(a, b) {
    const na = parseFloat(String(a).replace(',', '.'));
    const nb = parseFloat(String(b).replace(',', '.'));
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
}

function groupDetailsByParent(detailTasks) {
    const map = new Map();
    const sortedDetails = detailTasks
        .slice()
        .sort((a, b) => compareNumber(a.thu_tu_nhiem_vu_chi_tiet, b.thu_tu_nhiem_vu_chi_tiet));

    sortedDetails.forEach(item => {
        const key = item.ma_nhiem_vu_id;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
    });

    return map;
}

function renderMainTaskBlock(task, details) {
    const progressPercent = toPercent(task.ti_le_hoan_thanh || (normalizeStatus(task.trang_thai) === 'hoàn thành' ? '100' : ''));
    const progressClass = statusClass(task.trang_thai);
    const detailCount = details.length;

    return `
        <article class="project-block">
            <div class="project-head">
                <div>
                    <h2 class="project-title">${escapeHtml(task.thu_tu_nhiem_vu)}. ${escapeHtml(task.ten_nhiem_vu)}</h2>
                    <p class="project-meta">
                        Mã nhiệm vụ: <strong>${escapeHtml(task.ma_nhiem_vu)}</strong> ·
                        ${escapeHtml(task.du_an)} · ${escapeHtml(task.giai_doan)} · ${escapeHtml(task.nhom_nhiem_vu)}
                    </p>
                </div>
                <span class="badge ${progressClass}">${escapeHtml(task.trang_thai || 'Chưa xác định')}</span>
            </div>

            <div class="meta-grid">
                ${metaItem('Người tạo', task.nguoi_tao)}
                ${metaItem('Ngày tạo', task.ngay_tao)}
                ${metaItem('Người phụ trách', task.nguoi_phu_trach)}
                ${metaItem('Phòng ban phối hợp', task.phong_ban_phoi_hop)}
                ${metaItem('Ngày bắt đầu', task.ngay_bat_dau)}
                ${metaItem('Hạn hoàn thành', task.han_hoan_thanh)}
                ${metaItem('Tiến độ', progressPercent ? `${progressPercent}%` : '')}
                ${metaItem('Ngày cập nhật', task.ngay_cap_nhat)}
            </div>

            <div class="section-box">
                <p class="section-title">Mô tả</p>
                <p class="text-block">${escapeHtml(task.mo_ta)}</p>
            </div>

            <div class="section-box">
                <p class="section-title">Mục tiêu</p>
                <p class="text-block">${escapeHtml(task.muc_tieu)}</p>
            </div>

            <div class="section-box">
                <p class="section-title">Chi tiết thực hiện (${detailCount} đầu việc)</p>
                ${details.length ? renderDetailTable(details) : '<p class="text-block muted">Chưa có nhiệm vụ chi tiết.</p>'}
            </div>

            <div class="section-box">
                <p class="section-title">Lịch sử</p>
                <p class="text-block">${escapeHtml(task.lich_su || 'Chưa có dữ liệu lịch sử.')} </p>
            </div>
        </article>
    `;
}

function metaItem(label, value) {
    return `
        <div class="meta-item">
            <span class="meta-label">${escapeHtml(label)}</span>
            <div class="meta-value">${escapeHtml(value || '—')}</div>
        </div>
    `;
}

function renderDetailTable(details) {
    const rows = details.map((item, idx) => {
        const progressClass = statusClass(item.trang_thai);
        const confirmText = item.xac_nhan_hoan_thanh || '';
        const overdueClass = isOverdue(item) && normalizeStatus(item.trang_thai) !== 'hoàn thành' ? ' class="danger-row"' : '';

        return `
            <tr${overdueClass}>
                <td>${escapeHtml(item.thu_tu_nhiem_vu_chi_tiet || idx + 1)}</td>
                <td>${escapeHtml(item.ten_nhiem_vu_chi_tiet)}</td>
                <td>${escapeHtml(item.mo_ta_chi_tiet)}</td>
                <td>${escapeHtml(item.dau_ra_can_dat)}</td>
                <td>${escapeHtml(item.nguoi_phu_trach)}</td>
                <td>${escapeHtml(item.nguoi_phoi_hop)}</td>
                <td>${escapeHtml(item.thoi_gian_bat_dau)}</td>
                <td>${escapeHtml(item.deadline_du_kien)}</td>
                <td>${escapeHtml(item.muc_do_uu_tien)}</td>
                <td><span class="badge ${progressClass}">${escapeHtml(item.trang_thai || 'Chưa xác định')}</span></td>
                <td>${escapeHtml(item.ngay_hoan_thanh_thuc_te)}</td>
                <td>${escapeHtml(confirmText)}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="table-wrap">
            <table class="plan-table">
                <thead>
                    <tr>
                        <th style="width: 4%;">STT</th>
                        <th style="width: 16%;">Tên nhiệm vụ chi tiết</th>
                        <th style="width: 18%;">Mô tả chi tiết</th>
                        <th style="width: 14%;">Đầu ra cần đạt</th>
                        <th style="width: 10%;">Người phụ trách</th>
                        <th style="width: 10%;">Người phối hợp</th>
                        <th style="width: 8%;">Bắt đầu</th>
                        <th style="width: 8%;">Deadline</th>
                        <th style="width: 6%;">Ưu tiên</th>
                        <th style="width: 6%;">Trạng thái</th>
                        <th style="width: 5%;">Hoàn thành</th>
                        <th style="width: 5%;">Xác nhận</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

function statusClass(status) {
    const s = normalizeStatus(status);
    if (s.includes('hoàn thành')) return 'success';
    if (s.includes('đang')) return 'info';
    if (s.includes('chưa')) return 'neutral';
    if (s.includes('trễ') || s.includes('quá hạn')) return 'danger';
    return 'warning';
}

function normalizeStatus(status) {
    return String(status || '').trim().toLowerCase();
}

function toPercent(value) {
    const raw = String(value || '').replace('%', '').trim();
    if (!raw) return '';
    const num = parseFloat(raw.replace(',', '.'));
    if (Number.isNaN(num)) return raw;
    return Math.max(0, Math.min(100, num)).toFixed(0);
}

function parseDateMaybe(value) {
    if (!value) return null;
    const str = String(value).trim();
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    const parts = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (parts) {
        const [, dd, mm, yyyy] = parts;
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
}

function isOverdue(item) {
    const deadline = parseDateMaybe(item.han_hoan_thanh || item.deadline_du_kien);
    if (!deadline) return false;

    const status = normalizeStatus(item.trang_thai);
    if (status.includes('hoàn thành')) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(23, 59, 59, 999);
    return deadline < today;
}

document.addEventListener('DOMContentLoaded', loadGapiAndInitialize);
