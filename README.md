# A2_Group11B_MidTermGame

# Grocery Helper

## Group Number
11B

## Group Members
- Yasmeen Kamal — 21072839
- Iba Abbasi — 21086411
- Moosa Malik — 20913010
- Elizabeth Ciceu — 21076645
- Chloe Ma — 21094314

## Description
Grocery Helper is an interactive narrative game that explores the hidden cognitive challenges of everyday grocery shopping.

Players take on the role of Alex and move through a grocery store, completing a series of fast-paced mini-games across different aisles. Each aisle represents a different real-world challenge often experienced by individuals with cognitive or intellectual disabilities, such as memory strain, sensory overload, decision fatigue, and time pressure.

What seems like a simple task becomes increasingly overwhelming as players must manage timers, distractions, and confusing information. The goal is not just to “win,” but to understand how design and environments can impact accessibility and mental load.

## Setup and Interaction Instructions
Run the project using a local server or p5.js live preview.

### Controls
- A / D or Arrow Keys → Move left/right in the store
- SPACE or ENTER → Enter an aisle (start a challenge)
- Mouse Click → Interact with mini-game elements
- Arrow Keys (Maze level) → Navigate
- H → Show hint

### Objective
- Explore the grocery store as Alex
- Enter each aisle and complete all 8 mini-game challenges
- Maintain accuracy and speed to earn points
- Finish all zones to complete the experience

## Core Mechanics
The game is divided into a central store hub and 8 unique mini-games:

Store Hub
- Side-scrolling grocery store environment
- Players walk between aisles
- Each aisle is a “zone” that triggers a challenge
- Progress bar tracks completion

## Accessibility and Disability Representation
Unlike a traditional “easy” accessibility game, Grocery Helper intentionally introduces friction to help players feel cognitive load.

The game highlights:

- how overwhelming environments affect decision-making
- how time pressure increases stress
- how small design choices (text clarity, layout, feedback) matter

By placing players in these situations, the game builds empathy and awareness for people who experience these challenges daily.

## Process and Design Rationale
The original concept focused on simplifying grocery shopping through supportive design.

However, through iteration, the game evolved into something more experiential:

- Instead of removing difficulty → it reveals hidden difficulty
- Instead of guiding players → it lets them struggle (intentionally)
- Instead of just accessibility → it focuses on empathy through gameplay

Design choices include:

- increasing difficulty over time
- visual distortion and clutter
- varied interaction styles per level
- narrative framing through Alex

## Iteration Notes
Iteration Notes
Major Changes from Initial Version
- Replaced simple item collection with 8 unique mini-games
- Added narrative intro (Alex) to frame the experience
- Introduced timers and pressure systems
- Expanded from a single mechanic → multiple cognitive challenges
- Shifted from “assistive gameplay” → empathy-driven gameplay

### Post-Playtest
During playtesting, players understood the core idea of moving through the store, but some felt the gameplay was too simple and leaned more toward being instructional rather than engaging. There was also confusion around the hint system, as players didn’t immediately understand how it worked or when to use it. Overall, feedback suggested that the game would benefit from feeling more like a dynamic, level-based experience with clearer mechanics and more variety in gameplay.

### Post-Showcase
Feedback summary:  
During the showcase, players responded positively to the visuals, style, and overall concept, but many noted that the experience still felt more like a demonstration than a fully developed game. Players wanted more variety, challenge, and progression to keep them engaged. There were also minor usability issues, such as text overflowing UI elements and unclear movement within the store, which made navigation feel less intuitive.

## Assets
Custom AI-generated assets:
- store.png
- milk_aisle.png
- milkcarton1.png
- UI, animations, and effects built in p5.js
- Audio generated using Web Audio API in code

## References
1. Government of Canada. 2025. *Designing for users with cognitive disabilities*. Digital Accessibility Toolkit. Retrieved March 12, 2026 from https://a11y.canada.ca/en/designing-for-users-with-cognitive-disabilities/

2. Leandro Soares Guedes, Ryan Colin Gibson, Kirsten Ellis, Laurianne Sitbon, and Monica Landoni. 2022. *Designing with and for People with Intellectual Disabilities*. In *Proceedings of the 24th International ACM SIGACCESS Conference on Computers and Accessibility (ASSETS ’22)*, Article 106, 1–6. Association for Computing Machinery, New York, NY, USA. https://doi.org/10.1145/3517428.3550406