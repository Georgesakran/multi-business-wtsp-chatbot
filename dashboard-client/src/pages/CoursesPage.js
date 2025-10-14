import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import CoursesTable from "../componenets/course/CoursesTable";
import CourseFormModal from "../componenets/course/CourseFormModal";
import CourseViewModal from "../componenets/course/CourseViewModal";
import FilterChips from "../componenets/course/FilterChips"; // adjust path
import CoursesFilters from "../componenets/course/CoursesFilters";
import { toast } from "react-toastify";
import "../styles/CoursesPage.css";

const PAGE_SIZE = 10;

const safeGetUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const CoursesPage = () => {
  const user = safeGetUser();
  const businessId = user?.businessId ?? null;

  // data
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [viewCourse, setViewCourse] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // --- DRAFT filter state (what user types) ---
  const [qDraft, setQDraft] = useState("");
  const [instructorDraft, setInstructorDraft] = useState("");
  const [priceMinDraft, setPriceMinDraft] = useState("");
  const [priceMaxDraft, setPriceMaxDraft] = useState("");
  const [capacityMinDraft, setCapacityMinDraft] = useState("");
  const [capacityMaxDraft, setCapacityMaxDraft] = useState("");
  const [dateFromDraft, setDateFromDraft] = useState("");
  const [dateToDraft, setDateToDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("any");
  const [sortByDraft, setSortByDraft] = useState("createdAt_desc");

  // --- APPLIED filter state (used for fetch + URL + chips) ---
  const [q, setQ] = useState("");
  const [instructor, setInstructor] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [capacityMin, setCapacityMin] = useState("");
  const [capacityMax, setCapacityMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("any");
  const [sortBy, setSortBy] = useState("createdAt_desc");
  const [page, setPage] = useState(1);


  // Is there anything typed in the form that isn't applied yet?
const hasPending =
qDraft !== q ||
instructorDraft !== instructor ||
priceMinDraft !== priceMin ||
priceMaxDraft !== priceMax ||
capacityMinDraft !== capacityMin ||
capacityMaxDraft !== capacityMax ||
dateFromDraft !== dateFrom ||
dateToDraft !== dateTo ||
statusDraft !== status ||
sortByDraft !== sortBy;

  // 1) INIT: read APPLIED from URL on mount, then COPY to DRAFT so the form shows them
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const initial = {
      q: p.get("q") || "",
      instructor: p.get("instructor") || "",
      priceMin: p.get("priceMin") || "",
      priceMax: p.get("priceMax") || "",
      capacityMin: p.get("capacityMin") || "",
      capacityMax: p.get("capacityMax") || "",
      dateFrom: p.get("dateFrom") || "",
      dateTo: p.get("dateTo") || "",
      status: p.get("status") || "any",
      sortBy: p.get("sortBy") || "createdAt_desc",
      page: Number(p.get("page") || 1),
    };

    // set applied
    setQ(initial.q);
    setInstructor(initial.instructor);
    setPriceMin(initial.priceMin);
    setPriceMax(initial.priceMax);
    setCapacityMin(initial.capacityMin);
    setCapacityMax(initial.capacityMax);
    setDateFrom(initial.dateFrom);
    setDateTo(initial.dateTo);
    setStatus(initial.status);
    setSortBy(initial.sortBy);
    setPage(initial.page);

    // copy to drafts
    setQDraft(initial.q);
    setInstructorDraft(initial.instructor);
    setPriceMinDraft(initial.priceMin);
    setPriceMaxDraft(initial.priceMax);
    setCapacityMinDraft(initial.capacityMin);
    setCapacityMaxDraft(initial.capacityMax);
    setDateFromDraft(initial.dateFrom);
    setDateToDraft(initial.dateTo);
    setStatusDraft(initial.status);
    setSortByDraft(initial.sortBy);
  }, []);

  // 2) URL sync uses APPLIED only
  // ✅ only writes non-empty / non-default values into the URL
useEffect(() => {
  const p = new URLSearchParams();

  // only include values that are actually set
  if (q) p.set("q", q);
  if (instructor) p.set("instructor", instructor);
  if (priceMin) p.set("priceMin", priceMin);
  if (priceMax) p.set("priceMax", priceMax);
  if (capacityMin) p.set("capacityMin", capacityMin);
  if (capacityMax) p.set("capacityMax", capacityMax);
  if (dateFrom) p.set("dateFrom", dateFrom);
  if (dateTo) p.set("dateTo", dateTo);

  // include only if not default
  if (status !== "any") p.set("status", status);
  if (sortBy !== "createdAt_desc") p.set("sortBy", sortBy);
  if (page > 1) p.set("page", String(page));

  const qs = p.toString();
  const cleanUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;

  window.history.replaceState(null, "", cleanUrl);
}, [
  q, instructor, priceMin, priceMax, capacityMin, capacityMax,
  dateFrom, dateTo, status, sortBy, page
]);

  // lock background scroll when modal open
useEffect(() => {
  if (mobileFiltersOpen) {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }
}, [mobileFiltersOpen])





// 3) params for fetch use APPLIED
const params = useMemo(() => ({
  businessId,
  q: q || undefined,
  instructor: instructor || undefined,
  priceMin: priceMin || undefined,
  priceMax: priceMax || undefined,
  capacityMin: capacityMin || undefined,
  capacityMax: capacityMax || undefined,
  dateFrom: dateFrom || undefined,
  dateTo: dateTo || undefined,
  status: status !== "any" ? status : undefined,
  sortBy,
  limit: PAGE_SIZE,
  page
}), [businessId, q, instructor, priceMin, priceMax, capacityMin, capacityMax, dateFrom, dateTo, status, sortBy, page]);

// 4) APPLY + RESET handlers
const handleApply = () => {
  // Optional guard: auto-swap ranges if flipped
  if (priceMinDraft && priceMaxDraft && Number(priceMinDraft) > Number(priceMaxDraft)) {
    const tmp = priceMinDraft; setPriceMinDraft(priceMaxDraft); setPriceMaxDraft(tmp);
  }
  if (capacityMinDraft && capacityMaxDraft && Number(capacityMinDraft) > Number(capacityMaxDraft)) {
    const tmp = capacityMinDraft; setCapacityMinDraft(capacityMaxDraft); setCapacityMaxDraft(tmp);
  }

  // copy drafts -> applied
  setQ(qDraft.trim());
  setInstructor(instructorDraft.trim());
  setPriceMin(priceMinDraft);
  setPriceMax(priceMaxDraft);
  setCapacityMin(capacityMinDraft);
  setCapacityMax(capacityMaxDraft);
  setDateFrom(dateFromDraft);
  setDateTo(dateToDraft);
  setStatus(statusDraft);
  setSortBy(sortByDraft);

  setPage(1); // reset page on new query
};

const handleReset = () => {
  // clear both draft and applied
  setQDraft(""); setInstructorDraft(""); setPriceMinDraft(""); setPriceMaxDraft("");
  setCapacityMinDraft(""); setCapacityMaxDraft(""); setDateFromDraft(""); setDateToDraft("");
  setStatusDraft("any"); setSortByDraft("createdAt_desc");

  setQ(""); setInstructor(""); setPriceMin(""); setPriceMax("");
  setCapacityMin(""); setCapacityMax(""); setDateFrom(""); setDateTo("");
  setStatus("any"); setSortBy("createdAt_desc");
  setPage(1);
};


  const fetchCourses = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const { data } = await api.get("/courses", { params });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("❌ Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [businessId, params]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleDelete = async (id) => {
    if (!businessId) {
      toast.error("❌ Missing business ID");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      await api.delete(`/courses/${businessId}/${id}`);
      toast.success("✅ Course deleted");
      fetchCourses();
    } catch {
      toast.error("❌ Failed to delete course");
    }
  };

  if (!businessId) {
    return (
      <div className="courses-page">
        <p style={{ opacity: 0.8 }}>You’re not linked to a business. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="courses-page">
      <div className="courses-header">
          {/* Mobile-only filter trigger */}
          <button
            className="filters-trigger"      // <-- CSS makes this mobile-only
            onClick={() => setMobileFiltersOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={mobileFiltersOpen}
          >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Filters
          {hasPending && <span className="filters-dot" aria-hidden="true"></span>}
        </button>

        <button
          className="add-course-btn"
          onClick={() => { setEditCourse(null); setShowFormModal(true); }}
        >
          ➕ Add Course
        </button>
      </div>

      <div className="filters-inline">
        {/* Filters */}
        <CoursesFilters
          qDraft={qDraft} setQDraft={setQDraft}
          instructorDraft={instructorDraft} setInstructorDraft={setInstructorDraft}
          priceMinDraft={priceMinDraft} setPriceMinDraft={setPriceMinDraft}
          priceMaxDraft={priceMaxDraft} setPriceMaxDraft={setPriceMaxDraft}
          capacityMinDraft={capacityMinDraft} setCapacityMinDraft={setCapacityMinDraft}
          capacityMaxDraft={capacityMaxDraft} setCapacityMaxDraft={setCapacityMaxDraft}
          dateFromDraft={dateFromDraft} setDateFromDraft={setDateFromDraft}
          dateToDraft={dateToDraft} setDateToDraft={setDateToDraft}
          statusDraft={statusDraft} setStatusDraft={setStatusDraft}
          sortByDraft={sortByDraft} setSortByDraft={(v)=>setSortByDraft(v)}
          pending={hasPending}
          onApply={handleApply}
          onReset={handleReset}
        />
      </div>

      {/* If you use chips, they should reflect APPLIED values */}
      <FilterChips
        q={q} onQ={(v)=>{ setQ(v); setQDraft(v); setPage(1);} }
        instructor={instructor} onInstructor={(v)=>{ setInstructor(v); setInstructorDraft(v); setPage(1);} }
        priceMin={priceMin} onPriceMin={(v)=>{ setPriceMin(v); setPriceMinDraft(v); setPage(1);} }
        priceMax={priceMax} onPriceMax={(v)=>{ setPriceMax(v); setPriceMaxDraft(v); setPage(1);} }
        capacityMin={capacityMin} onCapacityMin={(v)=>{ setCapacityMin(v); setCapacityMinDraft(v); setPage(1);} }
        capacityMax={capacityMax} onCapacityMax={(v)=>{ setCapacityMax(v); setCapacityMaxDraft(v); setPage(1);} }
        dateFrom={dateFrom} onDateFrom={(v)=>{ setDateFrom(v); setDateFromDraft(v); setPage(1);} }
        dateTo={dateTo} onDateTo={(v)=>{ setDateTo(v); setDateToDraft(v); setPage(1);} }
        status={status} onStatus={(v)=>{ setStatus(v); setStatusDraft(v); setPage(1);} }
        sortBy={sortBy} onSortBy={(v)=>{ setSortBy(v); setSortByDraft(v); setPage(1);} }
        onClearAll={handleReset}
      />

      {/* Results: TABLE ONLY */}
      {loading ? (
        <div className="courses-loading" aria-busy="true"></div>
      ) : items.length === 0 ? (
        <div className="courses-empty">
          <p>No courses match your filters.</p>
          <button
            className="add-course-btn"
            onClick={() => { setEditCourse(null); setShowFormModal(true); }}
          >
            ➕ Create your first course
          </button>
        </div>
      ) : (
        <>
          <CoursesTable
            courses={items}
            onView={(course) => setViewCourse(course)}
            onEdit={(course) => { setEditCourse(course); setShowFormModal(true); }}
            onDelete={(id) => handleDelete(id)}
          />

          {/* Pagination (uses totalPages -> no warning) */}
          <div className="cb-pagination" role="navigation" aria-label="pagination" style={{ marginTop: 12 }}>
            <button
              className="cb-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ‹ Prev
            </button>
            <span className="cb-page-indicator">Page {page} of {totalPages}</span>
            <button
              className="cb-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next ›
            </button>
          </div>
        </>
      )}

      {mobileFiltersOpen && (
        <div
          className="filters-sheet"
          role="dialog"
        >
          <div className="filters-panel" role="document">
            <div className="filters-panel-header">
              <h3 id="filters-title">Filters</h3>
              <button
                className="icon-btn"
                aria-label="Close filters"
                onClick={() => setMobileFiltersOpen(false)}
              >
                ✕
              </button>
            </div>


            <div className="filters-panel-body">
              {/* Reuse the SAME component inside the sheet */}
              <CoursesFilters
                qDraft={qDraft} setQDraft={setQDraft}
                instructorDraft={instructorDraft} setInstructorDraft={setInstructorDraft}
                priceMinDraft={priceMinDraft} setPriceMinDraft={setPriceMinDraft}
                priceMaxDraft={priceMaxDraft} setPriceMaxDraft={setPriceMaxDraft}
                capacityMinDraft={capacityMinDraft} setCapacityMinDraft={setCapacityMinDraft}
                capacityMaxDraft={capacityMaxDraft} setCapacityMaxDraft={setCapacityMaxDraft}
                dateFromDraft={dateFromDraft} setDateFromDraft={setDateFromDraft}
                dateToDraft={dateToDraft} setDateToDraft={setDateToDraft}
                statusDraft={statusDraft} setStatusDraft={setStatusDraft}
                sortByDraft={sortByDraft} setSortByDraft={setSortByDraft}
                pending={hasPending}
                onApply={() => { handleApply(); setMobileFiltersOpen(false); }}
                onReset={handleReset}
              />
            </div>
          </div>
        </div>
      )}
      



      {/* Modals */}
      {showFormModal && (
        <CourseFormModal
          businessId={businessId}
          existingCourse={editCourse}
          onClose={() => setShowFormModal(false)}
          onCourseAdded={fetchCourses}
        />
      )}
      {viewCourse && (
        <CourseViewModal course={viewCourse} onClose={() => setViewCourse(null)} />
      )}
    </div>
  );
};

export default CoursesPage;