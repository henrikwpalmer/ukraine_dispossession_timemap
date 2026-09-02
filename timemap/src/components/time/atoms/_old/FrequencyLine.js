import React from "react";
import { line, curveMonotoneX, timeDay, rollup, max as d3max } from "d3";
import { getEventCategories } from "../../../common/utilities";

/**
 * Buckets a list of events by day and returns a sorted array of
 * { date, count } pairs, one per day that actually has events.
 */
function bucketByDay(events) {
    const validEvents = events.filter(
        (e) => e && e.datetime instanceof Date && !isNaN(e.datetime)
    );

    const counts = rollup(
        validEvents,
        (v) => v.length,
        (e) => timeDay(e.datetime).getTime()
    );

    return Array.from(counts, ([time, count]) => ({
        date: new Date(time),
        count,
    })).sort((a, b) => a.date - b.date);
}

/**
 * Renders one frequency line, anchored around a baseline Y position.
 * The line rises above the baseline proportionally to event count that day.
 */
function renderLine({ events, baselineY, colour, maxAmplitude, getDatetimeX, key }) {
    if (events.length === 0) return null;

    const buckets = bucketByDay(events);
    const maxCount = d3max(buckets, (d) => d.count) || 1;

    const lineGenerator = line()
        .curve(curveMonotoneX)
        .x((d) => getDatetimeX(d.date))
        .y((d) => baselineY - (d.count / maxCount) * maxAmplitude);

    return ( <
        path key = { key }
        className = "timeline-frequency-line"
        d = { lineGenerator(buckets) }
        style = {
            { stroke: colour, fill: "none" } }
        />
    );
}

/**
 * TimelineFrequencyLine
 *
 * Alternative to <Events /> for the timeline: instead of a dot/shape per
 * event, draws one line per category, tracing the daily event count.
 *
 * Props mirror the ones already passed to <Events /> in Timeline.js.
 */
const TimelineFrequencyLine = ({
    events,
    categories, // active category titles (array of strings), may be empty
    getDatetimeX, // (Date) => x pixel, from Timeline's scaleX
    getY, // (eventLike) => y pixel baseline, from Timeline
    getCategoryColor, // (categoryTitle) => colour string
    dims,
}) => {
    const maxAmplitude =
        categories && categories.length > 0 ?
        dims.trackHeight / (categories.length + 1) / 2 :
        dims.trackHeight / 3;

    // No categories yet: draw a single line across all events.
    if (!categories || categories.length === 0) {
        const baselineY = getY({ category: null, project: null });
        return ( <
            g clipPath = "url(#clip)" > {
                renderLine({
                    events,
                    baselineY,
                    colour: getCategoryColor(null),
                    maxAmplitude,
                    getDatetimeX,
                    key: "frequency-all",
                })
            } <
            /g>
        );
    }

    // Categories exist: one line per category, each on its own track.
    return ( <
        g clipPath = "url(#clip)" > {
            categories.map((cat) => {
                const catEvents = events.filter((event) =>
                    getEventCategories(event, categories).includes(cat)
                );
                const baselineY = getY({ category: cat, project: null });

                return renderLine({
                    events: catEvents,
                    baselineY,
                    colour: getCategoryColor(cat),
                    maxAmplitude,
                    getDatetimeX,
                    key: `frequency-${cat}`,
                });
            })
        } <
        /g>
    );
};

export default TimelineFrequencyLine;