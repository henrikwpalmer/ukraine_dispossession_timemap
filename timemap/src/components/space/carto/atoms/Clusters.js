import React, { useState } from "react";
import { Portal } from "react-portal";
import colors from "../../../../common/global";
import { groupEventsByCategory } from "./Events";
import {
  calcClusterOpacity,
  calcClusterSize,
  isLatitude,
  isLongitude,
  calculateTotalClusterPoints,
} from "../../../../common/utilities";

function Cluster({
  cluster,
  size,
  projectPoint,
  totalPoints,
  styles,
  renderHover,
  onClick,
  getClusterChildren,
  categories,
  getCategoryColor,
}) {
  /**
  {
    geometry: {
      coordinates: [longitude, latitude]
    },
    properties: {
      cluster: true|false,
      cluster_id: int,
      point_count: int,
      point_count_abbreviated: int
    },
    type: "Feature"
  }
  */
  const { cluster_id: clusterId } = cluster.properties;

  const individualChildren = getClusterChildren(clusterId);
  const clusterEvents = individualChildren.flatMap(
    (location) => location.events
  );
  const groups = groupEventsByCategory(
    clusterEvents,
    categories,
    getCategoryColor
  );

  const { coordinates } = cluster.geometry;
  const [longitude, latitude] = coordinates;
  const { x, y } = projectPoint([latitude, longitude]);
  const [hovered, setHovered] = useState(false);
  if (!isLatitude(latitude) || !isLongitude(longitude)) return null;

  // Single category in this cluster: one plain bubble, same as before.
  const dotRadius = groups.length > 1 ? size / 1.6 : size;
  const spread = groups.length > 1 ? size * 1.1 : 0;

  return (
    <svg>
      <g
        className="cluster-event"
        transform={`translate(${x}, ${y})`}
        onClick={(e) => onClick({ id: clusterId, latitude, longitude })}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {groups.map((group, i) => {
          const angle = (2 * Math.PI * i) / groups.length;
          const cx = spread * Math.cos(angle);
          const cy = spread * Math.sin(angle);

          return (
            <circle
              key={group.colour}
              className="cluster-event-marker"
              cx={cx}
              cy={cy}
              r={dotRadius}
              style={{ ...styles, fill: group.colour }}
            />
          );
        })}
        {hovered ? renderHover(cluster) : null}
      </g>
    </svg>
  );
}

function ClusterEvents({
  projectPoint,
  onSelect,
  getClusterChildren,
  isRadial,
  svg,
  clusters,
  categories,
  getCategoryColor,
  selected,
}) {
  const totalPoints = calculateTotalClusterPoints(clusters);

  const styles = {
    stroke: colors.darkBackground,
    strokeWidth: 0,
  };

  function renderHover(txt, circleSize) {
    return (
      <>
        <text
          textAnchor="middle"
          y="3px"
          style={{ fontWeight: "bold", fill: "black", zIndex: 10000 }}
        >
          {txt}
        </text>
        <circle
          className="event-hover"
          cx="0"
          cy="0"
          r={circleSize + 2}
          stroke={colors.primaryHighlight}
          fillOpacity="0.0"
        />
      </>
    );
  }

  return (
    <Portal node={svg}>
      <svg>
        <g className="cluster-locations">
          {clusters.map((c, idx) => {
            const pointCount = c.properties.point_count;
            const clusterSize = calcClusterSize(pointCount, totalPoints);
            return (
              <Cluster
                key={idx}
                onClick={onSelect}
                getClusterChildren={getClusterChildren}
                categories={categories}
                getCategoryColor={getCategoryColor}
                cluster={c}
                size={clusterSize}
                projectPoint={projectPoint}
                totalPoints={totalPoints}
                styles={{
                  ...styles,
                  fillOpacity: calcClusterOpacity(pointCount, totalPoints),
                }}
                renderHover={() => renderHover(pointCount, clusterSize)}
              />
            );
          })}
        </g>
      </svg>
    </Portal>
  );
}

export default ClusterEvents;
