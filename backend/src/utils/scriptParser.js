/**
 * Script Parser Utility
 * Parses screenplay text into structured scene data.
 * Handles standard screenplay format (Fountain-like).
 */

const SCENE_HEADING_REGEX = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*(.+?)(?:\s*[-–—]\s*(DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|CONTINUOUS|LATER|MOMENTS LATER|SAME TIME))?$/im;

const CHARACTER_CUE_REGEX = /^([A-Z][A-Z\s.'()-]+)(\s*\(.*?\))?\s*$/;
const PARENTHETICAL_REGEX = /^\((.+)\)$/;
const TRANSITION_REGEX = /^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:|SMASH CUT:|MATCH CUT:|JUMP CUT:)/i;
const ACTION_KEYWORDS = {
  props: /\b(picks up|grabs|holds|carries|sets down|places|puts|throws|drops|opens|closes)\s+(?:a |an |the )?(.+?)(?:\.|,|\s+and\b)/gi,
  costume: /\b(wearing|dressed in|wears|changed into|puts on|takes off)\s+(?:a |an |the )?(.+?)(?:\.|,|\s+and\b)/gi,
};

export function parseScreenplay(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { scenes: [], errors: ['No script content provided'] };
  }

  const lines = rawText.split(/\r?\n/);
  const scenes = [];
  const errors = [];
  let currentScene = null;
  let currentCharacter = null;
  let lineIndex = 0;
  let sceneCount = 0;

  for (const line of lines) {
    lineIndex++;
    const trimmed = line.trim();

    if (!trimmed) {
      currentCharacter = null;
      continue;
    }

    // Check for scene heading
    const headingMatch = trimmed.match(SCENE_HEADING_REGEX);
    if (headingMatch) {
      if (currentScene) {
        scenes.push(finalizeScene(currentScene));
      }

      sceneCount++;
      const locTypeRaw = headingMatch[1].replace('.', '').replace('/', '_').toLowerCase();
      let locationType = 'interior';
      if (locTypeRaw.includes('ext') && locTypeRaw.includes('int')) {
        locationType = 'int_ext';
      } else if (locTypeRaw.includes('ext')) {
        locationType = 'exterior';
      }

      const locationPart = headingMatch[2]?.trim() || '';
      const todRaw = headingMatch[3]?.trim().toLowerCase() || 'day';
      let timeOfDay = 'day';
      if (['night'].includes(todRaw)) timeOfDay = 'night';
      else if (['dawn'].includes(todRaw)) timeOfDay = 'dawn';
      else if (['dusk'].includes(todRaw)) timeOfDay = 'dusk';
      else if (['morning'].includes(todRaw)) timeOfDay = 'morning';
      else if (['afternoon'].includes(todRaw)) timeOfDay = 'afternoon';
      else if (['evening'].includes(todRaw)) timeOfDay = 'evening';

      currentScene = {
        sceneNumber: String(sceneCount),
        heading: trimmed,
        locationType,
        locationName: locationPart,
        timeOfDay,
        synopsis: '',
        actionLines: '',
        characters: new Set(),
        dialogues: [],
        props: new Set(),
        costumes: new Set(),
        specialEffects: new Set(),
        sortOrder: sceneCount - 1,
      };

      currentCharacter = null;
      continue;
    }

    if (!currentScene) continue;

    // Check for transitions (skip them)
    if (TRANSITION_REGEX.test(trimmed)) {
      continue;
    }

    // Check for character cue
    const charMatch = trimmed.match(CHARACTER_CUE_REGEX);
    if (charMatch && trimmed === trimmed.toUpperCase() && trimmed.length > 1 && !TRANSITION_REGEX.test(trimmed)) {
      const charName = charMatch[1].trim().replace(/\s*\(.*?\)\s*$/, '');
      if (charName.length > 1 && charName.length < 60) {
        currentCharacter = charName;
        currentScene.characters.add(charName);
        continue;
      }
    }

    // Check for parenthetical
    if (currentCharacter && PARENTHETICAL_REGEX.test(trimmed)) {
      if (currentScene.dialogues.length > 0) {
        const lastDialogue = currentScene.dialogues[currentScene.dialogues.length - 1];
        if (lastDialogue.characterName === currentCharacter) {
          lastDialogue.parenthetical = trimmed.replace(/^\(|\)$/g, '');
        }
      }
      continue;
    }

    // If we have a current character, this line is dialogue
    if (currentCharacter) {
      currentScene.dialogues.push({
        characterName: currentCharacter,
        dialogue: trimmed,
        parenthetical: null,
        sortOrder: currentScene.dialogues.length,
      });
      continue;
    }

    // Otherwise it's an action line
    currentScene.actionLines += (currentScene.actionLines ? '\n' : '') + trimmed;

    // Extract props from action
    let propMatch;
    const propsRegex = new RegExp(ACTION_KEYWORDS.props.source, 'gi');
    while ((propMatch = propsRegex.exec(trimmed)) !== null) {
      if (propMatch[2]) currentScene.props.add(propMatch[2].trim());
    }

    // Extract costumes from action
    let costumeMatch;
    const costumeRegex = new RegExp(ACTION_KEYWORDS.costume.source, 'gi');
    while ((costumeMatch = costumeRegex.exec(trimmed)) !== null) {
      if (costumeMatch[2]) currentScene.costumes.add(costumeMatch[2].trim());
    }

    // Check for VFX/SFX indicators
    if (/\b(VFX|CGI|GREEN SCREEN|WIRE|STUNT|EXPLOSION|SFX|SPECIAL EFFECT)/i.test(trimmed)) {
      currentScene.specialEffects.add(trimmed);
    }
  }

  // Push last scene
  if (currentScene) {
    scenes.push(finalizeScene(currentScene));
  }

  if (scenes.length === 0) {
    errors.push('No scenes could be extracted from the script. Ensure script uses standard screenplay format.');
  }

  return { scenes, errors };
}

function finalizeScene(scene) {
  return {
    sceneNumber: scene.sceneNumber,
    heading: scene.heading,
    locationType: scene.locationType,
    locationName: scene.locationName,
    timeOfDay: scene.timeOfDay,
    synopsis: scene.actionLines ? scene.actionLines.substring(0, 200) : '',
    actionLines: scene.actionLines,
    characters: Array.from(scene.characters),
    dialogues: scene.dialogues,
    props: Array.from(scene.props),
    costumes: Array.from(scene.costumes),
    specialEffects: Array.from(scene.specialEffects),
    sortOrder: scene.sortOrder,
  };
}

/**
 * Generate department tasks for a scene automatically
 */
export function generateDepartmentTasks(scene, scheduleId, projectId) {
  const tasks = [];
  const departments = [];

  // Camera is always needed
  departments.push({
    department: 'camera',
    title: `Camera setup for Scene ${scene.sceneNumber}`,
    description: `Prepare camera for: ${scene.heading}`,
    priority: 3,
  });

  // Lighting
  departments.push({
    department: 'lighting',
    title: `Lighting rig for Scene ${scene.sceneNumber}`,
    description: `${scene.timeOfDay} lighting setup at ${scene.locationName || 'location'}. ${scene.locationType === 'exterior' ? 'Exterior setup required.' : 'Interior lighting plan.'}`,
    priority: 3,
  });

  // Sound
  departments.push({
    department: 'sound',
    title: `Sound prep for Scene ${scene.sceneNumber}`,
    description: `Mic setup for ${scene.characters?.length || 0} characters. ${scene.locationType === 'exterior' ? 'Wind protection needed.' : ''}`,
    priority: 2,
  });

  // Direction
  departments.push({
    department: 'direction',
    title: `Block Scene ${scene.sceneNumber}`,
    description: `Blocking and rehearsal: ${scene.heading}`,
    priority: 3,
  });

  // Costume (if indicated)
  if (scene.characters?.length > 0) {
    departments.push({
      department: 'costume',
      title: `Costumes for Scene ${scene.sceneNumber}`,
      description: `Prepare costumes for: ${scene.characters.join(', ')}. ${scene.costumes?.length ? 'Specific: ' + scene.costumes.join(', ') : ''}`,
      priority: 2,
    });
  }

  // Makeup
  if (scene.characters?.length > 0) {
    departments.push({
      department: 'makeup',
      title: `Makeup for Scene ${scene.sceneNumber}`,
      description: `Prepare makeup for: ${scene.characters.join(', ')}`,
      priority: 2,
    });
  }

  // Art / Props
  if (scene.props?.length > 0) {
    departments.push({
      department: 'art',
      title: `Props for Scene ${scene.sceneNumber}`,
      description: `Required props: ${scene.props.join(', ')}`,
      priority: 2,
    });
  } else {
    departments.push({
      department: 'art',
      title: `Art setup for Scene ${scene.sceneNumber}`,
      description: `Set dressing for: ${scene.locationName || 'location'}`,
      priority: 1,
    });
  }

  // Stunts / VFX
  if (scene.specialEffects?.length > 0) {
    departments.push({
      department: 'stunts',
      title: `Stunts/Effects for Scene ${scene.sceneNumber}`,
      description: `Special requirements: ${scene.specialEffects.join('; ')}`,
      priority: 4,
    });
    departments.push({
      department: 'vfx',
      title: `VFX prep for Scene ${scene.sceneNumber}`,
      description: `VFX elements: ${scene.specialEffects.join('; ')}`,
      priority: 3,
    });
  }

  for (const dept of departments) {
    tasks.push({
      projectId,
      scheduleId,
      sceneId: scene.id,
      department: dept.department,
      title: dept.title,
      description: dept.description,
      priority: dept.priority,
      status: 'pending',
    });
  }

  return tasks;
}

/**
 * Generate a one-liner schedule from schedule scenes
 */
export function generateOneLiner(scheduleScenes) {
  return scheduleScenes.map((ss) => ({
    scene: ss.scene?.sceneNumber || ss.sceneId,
    heading: ss.scene?.heading || '',
    cast: ss.scene?.characters || [],
    location: ss.scene?.locationName || '',
    timeOfDay: ss.scene?.timeOfDay || '',
    pages: ss.scene?.pageCount || '',
    estimatedStart: ss.estimatedStartTime,
    estimatedEnd: ss.estimatedEndTime,
    status: ss.status,
  }));
}
