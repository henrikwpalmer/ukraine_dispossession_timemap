import React from "react";
import { Portal } from "react-portal";
import colors from "../../../../common/global";
import hash from "object-hash";
import { calcOpacity, getEventCategories } from "../../../../common/utilities";

/**
 * Given a location (a group of events at one lat/lng), groups its events
 * by category and returns one entry per category present:
 *   [{ colour, count }, ...]
 * Events with no matching category are grouped under the fallback colour.
 * This is deliberately NOT a proportion/blend — each category gets its
 * own full-strength entry, since categories represent distinct kinds of
 * data rather than parts of a whole.
 */
export function groupEventsByCategory(events, categories, getCategoryColor) {
  // Map.js passes categories as full association objects ({id, title, mode, ...}),
  // but getEventCategories expects an array of plain title strings (the shape
  // the Timeline uses). Convert here rather than changing the shared helper.
  const categoryTitles = categories.map((cat) => cat.title);
  const groups = {};

  events.forEach((event) => {
    const eventCategories = getEventCategories(event, categoryTitles);
    const cats = eventCategories.length > 0 ? eventCategories : [null];

    cats.forEach((cat) => {
      const colour = getCategoryColor(cat);
      if (!groups[colour]) groups[colour] = { colour, count: 0 };
      groups[colour].count += 1;
    });
  });

  return Object.values(groups);
}

function MapEvents({
  getCategoryColor,
  categories,
  projectPoint,
  styleLocation,
  selected,
  narrative,
  onSelect,
  svg,
  locations,
  eventRadius,
  coloringSet,
  filterColors,
  features,
}) {
  function handleEventSelect(e, location) {
    const events = e.shiftKey
      ? selected.concat(location.events)
      : location.events;
    onSelect(events);
  }

  function renderLocationSlicesByCategory(location) {
    const groups = groupEventsByCategory(location.events, categories, getCategoryColor);

    const styles = {
      stroke: colors.darkBackground,
      strokeWidth: 0,
    };

    // Single category at this location: one plain dot, same as before.
    if (groups.length <= 1) {
      const group = groups[0];
      return (
        <circle
          className="location-event-marker"
          cx={0}
          cy={0}
          r={eventRadius}
          fill={group ? group.colour : getCategoryColor(null)}
          fillOpacity={narrative ? 1 : calcOpacity(location.events.length)}
          style={styles}
        />
      );
    }

    // Multiple categories at this location: one distinct dot per
    // category, arranged in a small ring so none of them are hidden
    // behind another, rather than blended into one marker.
    const dotRadius = eventRadius / 1.6;
    const spread = eventRadius * 1.1;

    return (
      <>
        {groups.map((group, i) => {
          const angle = (2 * Math.PI * i) / groups.length;
          const cx = spread * Math.cos(angle);
          const cy = spread * Math.sin(angle);

          return (
            <circle
              key={group.colour}
              className="location-event-marker"
              cx={cx}
              cy={cy}
              r={dotRadius}
              fill={group.colour}
              fillOpacity={narrative ? 1 : calcOpacity(group.count)}
              style={styles}
            />
          );
        })}
      </>
    );
  }

  function renderLocation(location) {
    /**
    {
      events: [...],
      label: 'Location name',
      latitude: '47.7',
      longitude: '32.2'
    }
    */
    if (!location.latitude || !location.longitude) return null;
    const { x, y } = projectPoint([location.latitude, location.longitude]);

    // in narrative mode, only render events in narrative
    // TODO: move this to a selector
    if (narrative) {
      const { steps } = narrative;
      const onlyIfInNarrative = (e) => steps.map((s) => s.id).includes(e.id);
      const eventsInNarrative = location.events.filter(onlyIfInNarrative);

      if (eventsInNarrative.length <= 0) {
        return null;
      }
    }

    const customStyles = styleLocation ? styleLocation(location) : null;
    const extraRender = () => <>{customStyles[1]}</>;

    const isSelected = selected.reduce((acc, event) => {
      return (
        acc ||
        (event.latitude === location.latitude &&
          event.longitude === location.longitude)
      );
    }, false);

    return (
      <svg key={hash(location)}>
        <g
          className={`location-event ${narrative ? "no-hover" : ""}`}
          transform={`translate(${x}, ${y})`}
          onClick={(e) => handleEventSelect(e, location)}
        >
          {renderLocationSlicesByCategory(location)}
          {extraRender ? extraRender() : null}
          <circle
            className="event-hover"
            display={isSelected ? "auto" : "none"}
            cx="0"
            cy="0"
            r="10"
            stroke={colors.primaryHighlight}
            fillOpacity="0.0"
          />
        </g>
      </svg>
    );
  }

  return (
    <Portal node={svg}>
      <svg>
        <g className="event-locations">{locations.map(renderLocation)}</g>
      </svg>
    </Portal>
  );
}

export default MapEvents;
