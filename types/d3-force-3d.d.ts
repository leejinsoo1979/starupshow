declare module 'd3-force-3d' {
  import { SimulationNodeDatum, SimulationLinkDatum, Simulation } from 'd3-force'

  export interface ForceNode3D extends SimulationNodeDatum {
    x?: number
    y?: number
    z?: number
    vx?: number
    vy?: number
    vz?: number
    fx?: number | null
    fy?: number | null
    fz?: number | null
  }

  export interface ForceLink3D<N extends ForceNode3D> extends SimulationLinkDatum<N> {
    source: N | string | number
    target: N | string | number
  }

  export interface ForceSimulation3D<N extends ForceNode3D> {
    nodes(): N[]
    nodes(nodes: N[]): this
    alpha(): number
    alpha(alpha: number): this
    alphaMin(): number
    alphaMin(min: number): this
    alphaDecay(): number
    alphaDecay(decay: number): this
    alphaTarget(): number
    alphaTarget(target: number): this
    velocityDecay(): number
    velocityDecay(decay: number): this
    force(name: string): any
    force(name: string, force: any): this
    find(x: number, y: number, z?: number, radius?: number): N | undefined
    randomSource(): () => number
    randomSource(source: () => number): this
    on(typenames: string): (this: any) => void
    on(typenames: string, listener: ((this: any) => void) | null): this
    tick(iterations?: number): this
    restart(): this
    stop(): this
    numDimensions(): number
    numDimensions(dimensions: 1 | 2 | 3): this
  }

  export function forceSimulation<N extends ForceNode3D>(nodes?: N[]): ForceSimulation3D<N>

  export function forceCenter<N extends ForceNode3D>(
    x?: number,
    y?: number,
    z?: number
  ): {
    x(): number
    x(x: number): any
    y(): number
    y(y: number): any
    z(): number
    z(z: number): any
    strength(): number
    strength(strength: number): any
  }

  export function forceLink<N extends ForceNode3D, L extends ForceLink3D<N>>(
    links?: L[]
  ): {
    links(): L[]
    links(links: L[]): any
    id(): (node: N, i: number, nodes: N[]) => string | number
    id(id: (node: N, i: number, nodes: N[]) => string | number): any
    distance(): number | ((link: L, i: number, links: L[]) => number)
    distance(distance: number | ((link: L, i: number, links: L[]) => number)): any
    strength(): number | ((link: L, i: number, links: L[]) => number)
    strength(strength: number | ((link: L, i: number, links: L[]) => number)): any
    iterations(): number
    iterations(iterations: number): any
  }

  export function forceManyBody<N extends ForceNode3D>(): {
    strength(): number | ((node: N, i: number, nodes: N[]) => number)
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): any
    theta(): number
    theta(theta: number): any
    distanceMin(): number
    distanceMin(distance: number): any
    distanceMax(): number
    distanceMax(distance: number): any
  }

  export function forceCollide<N extends ForceNode3D>(
    radius?: number | ((node: N, i: number, nodes: N[]) => number)
  ): {
    radius(): number | ((node: N, i: number, nodes: N[]) => number)
    radius(radius: number | ((node: N, i: number, nodes: N[]) => number)): any
    strength(): number
    strength(strength: number): any
    iterations(): number
    iterations(iterations: number): any
  }

  export function forceRadial<N extends ForceNode3D>(
    radius: number | ((node: N, i: number, nodes: N[]) => number),
    x?: number,
    y?: number,
    z?: number
  ): {
    radius(): number | ((node: N, i: number, nodes: N[]) => number)
    radius(radius: number | ((node: N, i: number, nodes: N[]) => number)): any
    strength(): number | ((node: N, i: number, nodes: N[]) => number)
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): any
    x(): number
    x(x: number): any
    y(): number
    y(y: number): any
    z(): number
    z(z: number): any
  }

  export function forceX<N extends ForceNode3D>(
    x?: number | ((node: N, i: number, nodes: N[]) => number)
  ): {
    x(): number | ((node: N, i: number, nodes: N[]) => number)
    x(x: number | ((node: N, i: number, nodes: N[]) => number)): any
    strength(): number | ((node: N, i: number, nodes: N[]) => number)
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): any
  }

  export function forceY<N extends ForceNode3D>(
    y?: number | ((node: N, i: number, nodes: N[]) => number)
  ): {
    y(): number | ((node: N, i: number, nodes: N[]) => number)
    y(y: number | ((node: N, i: number, nodes: N[]) => number)): any
    strength(): number | ((node: N, i: number, nodes: N[]) => number)
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): any
  }

  export function forceZ<N extends ForceNode3D>(
    z?: number | ((node: N, i: number, nodes: N[]) => number)
  ): {
    z(): number | ((node: N, i: number, nodes: N[]) => number)
    z(z: number | ((node: N, i: number, nodes: N[]) => number)): any
    strength(): number | ((node: N, i: number, nodes: N[]) => number)
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): any
  }
}
