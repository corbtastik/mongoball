/**
 * Mongoball Configuration
 *
 * Centralized configuration for data sources, paths, and settings.
 */

export {
  // Data source definitions
  RETROSHEET,
  STATCAST,
  CHADWICK,
  LAHMAN,

  // Source groups
  DEFAULT_SOURCES,
  OPTIONAL_SOURCES,

  // Collection mapping
  COLLECTION_SOURCES,

  // Helper functions
  getSeasonUrls,
  getReferenceUrls,
  printSourceDocs,
} from './sources.js';
