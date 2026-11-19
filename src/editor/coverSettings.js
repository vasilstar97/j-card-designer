// Legacy projects used one feather value for all three edges.
export function readCoverFeathers(data) {
  const legacy = data.coverFeather === undefined ? 0 : data.coverFeather;
  return {
    coverBottomFeather: data.coverBottomFeather === undefined ? legacy : data.coverBottomFeather,
    coverSidesFeather: data.coverSidesFeather === undefined ? legacy : data.coverSidesFeather
  };
}
