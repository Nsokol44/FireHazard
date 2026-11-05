---
title: 'FireScore: a reusable, offline-capable wildfire vulnerability index for any US county'
tags:
  - Python
  - wildfire
  - wildland-urban interface
  - GIS
  - vulnerability index
  - egress
authors:
  - name: Katy Daniels
    affiliation: 1
  - name: Nicholas J. Sokol
    orcid: 0000-0002-4798-0056
    affiliation: 1
affiliations:
  - name: Department of Geography & Sustainability, University of Tennessee, Knoxville, TN, USA
    index: 1
date: 5 November 2026
bibliography: paper.bib
---

# Summary

County fire departments allocate finite mitigation budgets, defensible-space inspections, hydrant installation, and secondary-egress requirements, across thousands of structures, usually by proximity to the most recent burn or by staff judgement. `FireScore` is a Python package that computes a structure-level wildfire vulnerability index for any US county from free national data with one command (`firescore run --county "Sevier, TN"`) and hands the fire marshal a scored layer the same day. Its five components, egress counted as outward road exits on the real OpenStreetMap graph (motivated by the fatality-risk threshold near six community exits found by @fong2026egress), water access, LANDFIRE fuel models, wind-aligned terrain exposure from USGS 3DEP, and structure-to-structure spacing, are combined under a versioned YAML configuration. Every score is reported as a range across five weight-sensitivity configurations rather than as a point value. In this repository the FireScore engine lives under `engine/` alongside Firehouse GIS, an offline-first field viewer built on the same scores.

# Statement of need

Existing parcel-level tools are either national fire-behaviour products that cannot be retuned locally, or single-jurisdiction indices published without reusable software. FireScore is built for the operational cadence of a county department. One online fetch populates a GeoParquet and GeoTIFF cache with a per-layer provenance manifest, and every later run, scoring, validation, what-if mitigation analysis, PDF report cards, the inspection queue, and the offline FireView field map, works with no network, which matters in mountain counties with patchy coverage and during incidents. County-supplied layers (parcels, hydrants, stations) override the national layers under a documented precedence, and whatever cannot be observed directly is labelled rather than hidden: FEMA building footprints are stamped as parcel proxies in every output, and where mapped hydrants are too sparse to use, water access falls back to mapped water features as drafting sites, labelled as a proxy in the data and on the report cards. Validation is built in, and its limits are reported with the same prominence as its results (see the research impact statement).

# State of the field

Composite vulnerability indices have a long history in hazards geography [@cutter2003svi], but they are typically published as one-off analyses of a single place. The building-level wildfire vulnerability index of @papathoma2022buildings is carefully specified for its study context and, like most published indices, ships as a paper rather than as software another jurisdiction can run. At the other pole, the First Street Foundation model estimates probabilistic wildfire risk for individual parcels across the contiguous United States [@kearns2022fsf], but its methods are not open to local retuning, its inputs cannot be replaced by a county's own hydrant or parcel layers, and it produces none of the working products a mitigation program spends from. The evacuation literature, reviewed by @zehra2024evacuations, establishes road-network structure as a first-order determinant of outcomes, and @fong2026egress quantify it, yet that evidence has not been packaged into county-scale operational software. FireScore occupies this gap: open methods, national inputs, local configuration, practitioner outputs, and offline operation.

# Software design

FireScore is a pip-installable package organised around a per-county cache and a versioned configuration file (`config_version` 2) that holds every constant a county might tune: weights, distance clips, class thresholds, fuel hazard values, and what-if planning costs. The index combines five components, each bounded to [0, 1]. Egress clusters structures (DBSCAN), counts outward exits per cluster on the OpenStreetMap drive graph against the six-exit reference of @fong2026egress, and adds dead-end status, drive distance to the nearest station computed over the graph, and distance to road. Water access is distance to the nearest usable source under a documented precedence (county hydrants, mapped hydrants, labelled draft-site proxy, station drive fallback), with the normalising clip following the construct each source measures. Vegetation maps the modal LANDFIRE FBFM40 fuel model near each structure through an ordinal hazard table and mixes it with distance to wildland, where wildland is a contiguous burnable patch of at least one hectare. Terrain combines 3DEP slope with wind-aligned exposure relative to a configurable downslope wind direction. Spacing, absent from most indices, captures structure-to-structure spread from nearest-neighbour footprint distance. Scores are computed under five weight configurations (default, egress-dominant, water-dominant, fuel-dominant, equal) and reported as a default value with its range, with classes assigned at thresholds of 0.35, 0.55, and 0.75. Runs are deterministic: repeated offline runs reproduce every numeric column exactly. Practitioner outputs include a what-if editor (clear vegetation, add a hydrant, add a second road exit) that ranks actions by score reduction per dollar, one-page PDF report cards with proxy labels printed and screening-not-prediction wording, a persistent inspection queue ranked worst-first, and geospatial exports including the self-contained FireView offline field package. A test suite of offline tests, including coordinate-system consistency and what-if monotonicity guards, ships with the package and runs in continuous integration.

Validation ships as two designs. The governing one is a multi-event design against incident records with structure outcomes, built for the Sevier County, Tennessee testbed from NASF (FPA-FOD) and Tennessee fiResponse extracts: 208 harmonised events, 20 with destroyed structures and 2,686 structures destroyed, with threatened structures (1,129) treated strictly as exposure under the reporting definitions of the FPA-FOD standard. A perimeter design against cached burn perimeters is retained and labelled as diagnostic, because its own output shows that perimeter membership measures exposure rather than loss. The companion research manuscript reports both designs in full, including the null result described below.

# Research impact statement

FireScore is in operational pilot use. In Sevier County, Tennessee it scored 75,227 structures offline in about 90 seconds, and the county mitigation program led by the first author works from its inspection queue and report cards. The same code and shipped default configuration, unmodified, scored 79,056 structures in neighbouring Blount County, which is the portability evidence for the any-county claim. The software anchors a three-paper research program on the 2016 Chimney Tops 2 fire, supplying the measurement layer for a companion climatology reconstruction and a companion policy study (both manuscripts in preparation), and its multi-event testbed produced a result we regard as part of its impact: mean scores of exposed structures do not separate events with destroyed structures from events without (0.42 against 0.46), so the index is presented to its users as a screening and prioritisation tool, not a loss predictor. That candour, encoded in the outputs themselves, is what makes the rankings safe to spend from.

# AI usage disclosure

Generative AI (Claude, Anthropic) was used in the creation of this software and this paper. It assisted with code generation and refactoring, test scaffolding, and documentation and manuscript drafting, under the direction of the human authors. The human authors framed the problem, made the core design decisions (component definitions, data sources, configuration values, and the validation protocol, including the decision to retire the perimeter-based validation claim in favour of the multi-event design), and reviewed, edited, and validated all AI-assisted outputs, including live end-to-end runs on Sevier County and an unmodified second-county run on Blount County, Tennessee. The authors bear full responsibility for the accuracy and originality of the software and this paper.

# Acknowledgements

FireScore builds on OpenStreetMap (© OpenStreetMap contributors), USGS 3DEP, LANDFIRE, FEMA USA Structures, and the USFS Wildfire Risk to Communities programme. We thank Sevier County Fire and Rescue for the incident extracts and final damage assessments used to anchor the validation mapping. The Sevier County pilot is led by Katy Daniels in her role with Sevier County Fire and Rescue, declared as a competing interest in the companion manuscript.

# References
