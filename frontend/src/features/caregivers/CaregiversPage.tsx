import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  MagnifyingGlass,
  MapPin,
  UserCircle,
} from "@phosphor-icons/react";
import { useWorkspace } from "../../data/useWorkspace";
import {
  EmptyState,
  ErrorMessage,
  LoadingState,
} from "../../components/ui/Primitives";
import { useAuth } from "../../auth/useAuth";

export function CaregiversPage() {
  const { caregivers, cases, loading, error, refresh } = useWorkspace();
  const { isDemo } = useAuth();
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("all");
  const filtered = useMemo(
    () =>
      caregivers.filter(
        (caregiver) =>
          `${caregiver.name} ${caregiver.serviceArea} ${caregiver.role} ${caregiver.specialities.join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (availability === "all" || caregiver.availability === availability),
      ),
    [caregivers, search, availability],
  );

  return (
    <section className="caregivers-page" aria-labelledby="caregivers-heading">
      <div className="page-heading">
        <div>
          <h1 id="caregivers-heading" className="h-display page-title">
            Caregiver directory
          </h1>
          <p className="page-description">
            Find a local responder by service area, role, and current
            availability.
          </p>
        </div>
      </div>
      <div className="caregiver-overview">
        <span className="caregiver-overview__number">{caregivers.length}</span>
        <span>
          <strong>Registered caregivers</strong>
          <small>Assignment availability is set by the response team.</small>
        </span>
        <span className="caregiver-overview__assignments">
          {
            cases.filter(
              (item) =>
                item.caregiverId &&
                !["verified", "closed"].includes(item.status),
            ).length
          }{" "}
          active assignments
        </span>
      </div>
      <div className="directory-panel">
        <div className="directory-heading">
          <h2 className="h-display">Team by service area</h2>
          <span>{filtered.length} people</span>
        </div>
        <div className="queue-controls directory-controls">
          <label className="search-field">
            <MagnifyingGlass size={17} />
            <input
              aria-label="Search caregivers"
              placeholder="Search name, region or skill"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="filter-select">
            <span className="visually-hidden">Filter by availability</span>
            <select
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
              aria-label="Filter availability"
            >
              <option value="all">All availability</option>
              <option value="Available">Available</option>
              <option value="On field">On field</option>
              <option value="At capacity">At capacity</option>
            </select>
          </label>
        </div>
        {loading ? (
          <LoadingState label="Loading caregiver directory" />
        ) : error ? (
          <ErrorMessage onRetry={() => void refresh()}>{error}</ErrorMessage>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No caregivers match"
            detail="Try another service area, role, or availability filter."
            action={
              <button
                className="text-action"
                onClick={() => {
                  setSearch("");
                  setAvailability("all");
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="caregiver-table-wrap">
            <table className="caregiver-table">
              <thead>
                <tr>
                  <th>Name and role</th>
                  <th>Service area</th>
                  <th>Specialities</th>
                  <th>Availability</th>
                  <th>Active cases</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((caregiver) => (
                  <tr key={caregiver.id}>
                    <td>
                      <div className="caregiver-identity">
                        <UserCircle size={29} weight="light" />
                        <span>
                          <strong>{caregiver.name}</strong>
                          <small>{caregiver.role}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="case-location">
                        <MapPin size={14} />
                        {caregiver.serviceArea}
                      </span>
                    </td>
                    <td>
                      <div className="specialities">
                        {caregiver.specialities.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`availability availability--${caregiver.availability.toLowerCase().replace(" ", "-")}`}
                      >
                        <i />
                        {caregiver.availability}
                      </span>
                    </td>
                    <td>
                      <span className="assigned-count">
                        {isDemo
                          ? cases.filter(
                              (item) =>
                                item.caregiverId === caregiver.id &&
                                !["verified", "closed"].includes(item.status),
                            ).length
                          : caregiver.assignedCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="caregiver-mobile-list">
            {filtered.map((caregiver) => {
              const activeCount = isDemo
                ? cases.filter(
                    (item) =>
                      item.caregiverId === caregiver.id &&
                      !["verified", "closed"].includes(item.status),
                  ).length
                : caregiver.assignedCount;
              return (
                <article className="caregiver-mobile-row" key={caregiver.id}>
                  <div className="caregiver-mobile-head">
                    <UserCircle size={32} weight="light" />
                    <span>
                      <strong>{caregiver.name}</strong>
                      <small>{caregiver.role}</small>
                    </span>
                  </div>
                  <span className="case-location">
                    <MapPin size={14} /> {caregiver.serviceArea}
                  </span>
                  <div className="specialities">
                    {caregiver.specialities.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                  <div className="caregiver-mobile-foot">
                    <span
                      className={`availability availability--${caregiver.availability.toLowerCase().replace(" ", "-")}`}
                    >
                      <i /> {caregiver.availability}
                    </span>
                    <span>
                      {activeCount} active{" "}
                      {activeCount === 1 ? "case" : "cases"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <div className="caregiver-footnote">
        <span>
          Assignments and availability are managed by your response coordinator.
        </span>
        <Link to="/reports" className="text-action">
          Return to case queue <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
