import { Scanner } from './scanner.js';
import { BundleAnalyzer } from '../engines/bundle/bundleAnalyzer.js';
import { DependencyAnalyzer } from '../engines/dependency/dependencyAnalyzer.js';
import { DependencyDepthAnalyzer } from '../engines/dependency/dependencyDepthAnalyzer.js';
import { ComponentAnalyzer } from '../engines/component/componentAnalyzer.js';
import { RenderAnalyzer } from '../engines/render/renderAnalyzer.js';
import { MemoryAnalyzer } from '../engines/memory/memoryAnalyzer.js';
import { ImageAnalyzer } from '../engines/image/imageAnalyzer.js';
import { ApiAnalyzer } from '../engines/api/apiAnalyzer.js';
import { BuildAnalyzer } from '../engines/build/buildAnalyzer.js';
import { RscAnalyzer } from '../engines/rsc/rscAnalyzer.js';
import { VitalsAnalyzer } from '../engines/vitals/vitalsAnalyzer.js';
import { MonorepoAnalyzer } from '../engines/monorepo/monorepoAnalyzer.js';
import { FrameworkAnalyzer } from '../engines/framework/frameworkAnalyzer.js';
/**
 * Registers all built-in analysis engines on a scanner instance.
 */
export function registerDefaultEngines(scanner, config) {
    scanner.registerEngine(new BundleAnalyzer(config));
    scanner.registerEngine(new DependencyAnalyzer(config));
    scanner.registerEngine(new DependencyDepthAnalyzer(config));
    scanner.registerEngine(new ComponentAnalyzer(config));
    scanner.registerEngine(new RenderAnalyzer(config));
    scanner.registerEngine(new MemoryAnalyzer(config));
    scanner.registerEngine(new ImageAnalyzer(config));
    scanner.registerEngine(new ApiAnalyzer(config));
    scanner.registerEngine(new BuildAnalyzer(config));
    scanner.registerEngine(new RscAnalyzer(config));
    scanner.registerEngine(new VitalsAnalyzer(config));
    scanner.registerEngine(new MonorepoAnalyzer(config));
    scanner.registerEngine(new FrameworkAnalyzer(config));
}
/**
 * Creates a scanner with all default engines registered.
 */
export function createScanner(config) {
    const scanner = new Scanner(config);
    registerDefaultEngines(scanner, config);
    return scanner;
}
