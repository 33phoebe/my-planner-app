const MealPlanner = ({ currentWeek }) => {
    const { weeklySummaries, updateWeeklySummary } = useContext(DataContext);
    const [isGeneratingList, setIsGeneratingList] = useState(false);
    const [isAnalyzingMacros, setIsAnalyzingMacros] = useState(false);
    const [macroAnalysis, setMacroAnalysis] = useState('');
    const [dailyMacros, setDailyMacros] = useState({});
    const [isEditingShoppingList, setIsEditingShoppingList] = useState(false);
    
    // Expandable sections state
    const [expandedSections, setExpandedSections] = useState({
        foodStock: false,
        macroAnalysis: false,
        shoppingList: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Refs to maintain cursor position
    const textareaRefs = useRef({});
    const updateTimers = useRef({});

    const weekKey = format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
   
    
    // Get previous week's macro targets with proper fallback
    const getPreviousWeekTargets = useCallback(() => {
    const previousWeek = subWeeks(currentWeek, 1);
    const previousWeekKey = format(startOfWeek(previousWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const previousData = weeklySummaries[previousWeekKey];
    
    if (previousData?.macroTargets) {
        return { ...previousData.macroTargets };
    }
    return { ...FIXED_DEFAULT_MACROS };
}, [currentWeek, weeklySummaries]); // Removed FIXED_DEFAULT_MACROS from dependencies since it's now constant

    // CRITICAL FIX: Isolated weekly data with proper data handling
    const weeklyData = React.useMemo(() => {
    const stored = weeklySummaries[weekKey];
    
    if (!stored) {
        return {
            meals: {},
            shoppingList: '',
            foodStock: '',
            macroAnalysis: '',
            macroTargets: getPreviousWeekTargets()
        };
    }
    
    return {
        meals: stored.meals || {},
        shoppingList: stored.shoppingList || '',
        foodStock: stored.foodStock || '',
        macroAnalysis: stored.macroAnalysis || '',
        macroTargets: stored.macroTargets || FIXED_DEFAULT_MACROS
    };
}, [weeklySummaries, weekKey, getPreviousWeekTargets]);

    // Clear UI state when week changes
    React.useEffect(() => {
        setDailyMacros({});
        setMacroAnalysis(weeklyData.macroAnalysis || '');
        setIsEditingShoppingList(false);
    }, [weekKey, weeklyData.macroAnalysis]);
    
    const weekDays = eachDayOfInterval({
        start: startOfWeek(currentWeek, {weekStartsOn:1}), 
        end: endOfWeek(currentWeek, {weekStartsOn:1})
    });
    
    const mealTypes = ['Lunch', 'Dinner', 'Snacks', 'Notes'];

    // Debounced update function
    const debouncedUpdate = useCallback((key, updateFunction, delay = 300) => {
        if (updateTimers.current[key]) {
            clearTimeout(updateTimers.current[key]);
        }
        
        updateTimers.current[key] = setTimeout(() => {
            updateFunction();
            delete updateTimers.current[key];
        }, delay);
    }, []);

    // Handle meal change with cursor position preservation
    const handleMealChange = useCallback((day, meal, value, textareaId) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const textarea = textareaRefs.current[textareaId];
        const cursorPosition = textarea?.selectionStart || 0;
        
        const updatedMeals = {
            ...weeklyData.meals,
            [dayKey]: {
                ...weeklyData.meals?.[dayKey],
                [meal]: value
            }
        };
        
        debouncedUpdate(`meal-${textareaId}`, () => {
            // CRITICAL: Create isolated update that only affects current week
            const isolatedUpdate = {
                ...weeklyData,
                meals: updatedMeals
            };
            updateWeeklySummary(weekKey, isolatedUpdate);
            
            setTimeout(() => {
                if (textarea && document.activeElement === textarea) {
                    textarea.setSelectionRange(cursorPosition, cursorPosition);
                }
            }, 0);
        }, 100);
    }, [weeklyData, weekKey, debouncedUpdate, updateWeeklySummary]);

    // SUPER CRITICAL FIX: Food stock change with complete isolation
    const handleFoodStockChange = useCallback((value) => {
        const textarea = textareaRefs.current['foodStock'];
        const cursorPosition = textarea?.selectionStart || 0;
        
        debouncedUpdate('foodStock', () => {
            // CRITICAL: Create completely isolated update for current week only
            const isolatedUpdate = {
                ...weeklyData,
                foodStock: value
            };
            updateWeeklySummary(weekKey, isolatedUpdate);
            
            setTimeout(() => {
                if (textarea && document.activeElement === textarea) {
                    textarea.setSelectionRange(cursorPosition, cursorPosition);
                }
            }, 0);
        }, 100);
    }, [weeklyData, weekKey, debouncedUpdate, updateWeeklySummary]);

    // Handle shopping list change
    const handleShoppingListChange = useCallback((value) => {
        const textarea = textareaRefs.current['shoppingList'];
        const cursorPosition = textarea?.selectionStart || 0;
        
        debouncedUpdate('shoppingList', () => {
            const isolatedUpdate = {
                ...weeklyData,
                shoppingList: value
            };
            updateWeeklySummary(weekKey, isolatedUpdate);
            
            setTimeout(() => {
                if (textarea && document.activeElement === textarea) {
                    textarea.setSelectionRange(cursorPosition, cursorPosition);
                }
            }, 0);
        }, 100);
    }, [weeklyData, weekKey, debouncedUpdate, updateWeeklySummary]);

    // Handle macro target changes
    const handleMacroTargetChange = (macro, value) => {
        const updatedTargets = {
            ...weeklyData.macroTargets,
            [macro]: parseInt(value) || 0
        };
        const isolatedUpdate = {
            ...weeklyData,
            macroTargets: updatedTargets
        };
        updateWeeklySummary(weekKey, isolatedUpdate);
    };

    // SUPER CRITICAL FIX: Copy from previous week - using the EXACT same pattern as optimize
    const copyFromPreviousWeek = useCallback(async () => {
        try {
            const previousWeek = subWeeks(currentWeek, 1);
            const previousWeekKey = format(startOfWeek(previousWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const previousData = weeklySummaries[previousWeekKey];
            
            if (previousData?.meals && Object.keys(previousData.meals).length > 0) {
                // Use EXACT same pattern as generateOptimizedMealPlan
                const newData = {
                    ...weeklyData,
                    meals: { ...previousData.meals }, // Copy meals
                    shoppingList: '', // Reset
                    macroAnalysis: '' // Reset
                    // Keep current foodStock and macroTargets
                };
                
                await updateWeeklySummary(weekKey, newData);
                setDailyMacros({});
                setMacroAnalysis('');
                
                // Use same refresh pattern as optimize
                setTimeout(() => {
                    window.location.reload();
                }, 100);
                
                alert('Meal plan copied successfully! Page will refresh to show updated data.');
            } else {
                alert('No meal plan found for previous week');
            }
        } catch (error) {
            console.error('Error copying previous week:', error);
            alert('Error copying previous week data');
        }
    }, [currentWeek, weekKey, weeklySummaries, weeklyData, updateWeeklySummary]);

    // Reset meal plan
    const resetMealPlan = useCallback(async () => {
        if (window.confirm('Are you sure you want to reset the entire meal plan for this week?')) {
            const resetData = {
                ...weeklyData,
                meals: {},
                foodStock: '',
                shoppingList: '',
                macroAnalysis: ''
            };
            
            await updateWeeklySummary(weekKey, resetData);
            
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }
    }, [weekKey, weeklyData, updateWeeklySummary]);

    // SUPER CRITICAL FIX: Inherit stock with complete isolation
    const inheritStockWithAdjustments = useCallback(async () => {
        const previousWeek = subWeeks(currentWeek, 1);
        const previousWeekKey = format(startOfWeek(previousWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const previousData = weeklySummaries[previousWeekKey];
        
        const previousStock = previousData?.foodStock;
        
        if (previousStock && previousStock.trim()) {
            const adjustedStock = previousStock.split('\n').map(line => {
                if (!line.trim()) return line;
                
                const patterns = [
                    /^([•\-*\s]*)(.*?)[-:]\s*(\d+)\s*servings?/i,
                    /^([•\-*\s]*)(.*?)\s+(\d+)\s*servings?/i,
                    /^([•\-*\s]*)(.*?)[-:]\s*(\d+)/i
                ];
                
                for (const pattern of patterns) {
                    const match = line.match(pattern);
                    if (match) {
                        const prefix = match[1] || '';
                        const item = match[2].trim();
                        const currentServings = parseInt(match[3]);
                        
                        if (currentServings > 0) {
                            let reduction = 4;
                            const itemLower = item.toLowerCase();
                            
                            if (itemLower.includes('meat') || itemLower.includes('chicken') || 
                                itemLower.includes('fish') || itemLower.includes('beef') || 
                                itemLower.includes('pork')) {
                                reduction = 7;
                            } else if (itemLower.includes('vegetable') || itemLower.includes('fruit')) {
                                reduction = 5;
                            } else if (itemLower.includes('grain') || itemLower.includes('rice') || 
                                      itemLower.includes('pasta')) {
                                reduction = 3;
                            }
                            
                            const newServings = Math.max(0, currentServings - reduction);
                            return `${prefix}${item} - ${newServings} serving${newServings !== 1 ? 's' : ''}`;
                        }
                    }
                }
                return line;
            }).join('\n');
            
            // CRITICAL: Completely isolated update for current week only
            const isolatedUpdate = {
                ...weeklyData,
                foodStock: adjustedStock
            };
            
            await updateWeeklySummary(weekKey, isolatedUpdate);
            
            // Force immediate textarea update
            setTimeout(() => {
                const textarea = textareaRefs.current['foodStock'];
                if (textarea) {
                    textarea.value = adjustedStock;
                }
            }, 50);
        }
    }, [currentWeek, weeklyData, weekKey, weeklySummaries, updateWeeklySummary]);

    // Generate optimized meal plan (working - keep as-is)
    const generateOptimizedMealPlan = useCallback(async () => {
        const previousWeek = subWeeks(currentWeek, 1);
        const previousWeekKey = format(startOfWeek(previousWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const previousData = weeklySummaries[previousWeekKey];
        
        if (!previousData?.meals || Object.keys(previousData.meals).length === 0) {
            alert('No baseline meal plan found from previous week. Please copy last week first or create a meal plan manually.');
            return;
        }

        if (!window.confirm('Optimize last week\'s meal plan with minor healthy improvements? This will replace your current meal plan.')) {
            return;
        }

        setIsAnalyzingMacros(true);

        try {
            const targets = weeklyData.macroTargets;
            const stockText = weeklyData.foodStock || 'No specific unused items from last week';
            
            const previousMealText = Object.entries(previousData.meals).map(([day, meals]) => {
                const date = format(parseISO(day), 'EEEE');
                const mealEntries = Object.entries(meals)
                    .filter(([mealType]) => mealType !== 'Notes')
                    .map(([mealType, meal]) => meal ? `  ${mealType}: ${meal}` : null)
                    .filter(Boolean)
                    .join('\n');
                return `${date}:\n${mealEntries}`;
            }).join('\n\n');
            
            const prompt = `Optimize this meal plan with MINIMAL changes to meet macro targets:
Daily targets: ${targets.calories}cal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat

Keep 80% identical. Only small swaps: cooking methods, portions, add vegetables.
Suggest 1-2 NEW healthy ingredients per day (not in unused stock).
Keep prep simple.

Unused items (don't suggest): ${stockText}

Baseline plan:
${previousMealText}

Return JSON:
{
  "monday": {"Lunch": "meal", "Dinner": "meal", "Snacks": "snack"},
  "tuesday": {"Lunch": "meal", "Dinner": "meal", "Snacks": "snack"},
  ... continue for all days
}`;

            const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { 
                contents: chatHistory,
                generationConfig: { responseMimeType: "application/json" }
            };
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const optimizedPlan = JSON.parse(result.candidates[0].content.parts[0].text);
                
                const formattedMeals = {};
                weekDays.forEach(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayName = format(day, 'EEEE').toLowerCase();
                    
                    if (optimizedPlan[dayName]) {
                        formattedMeals[dayKey] = optimizedPlan[dayName];
                    }
                });
                
                const newData = {
                    ...weeklyData,
                    meals: formattedMeals,
                    shoppingList: '', 
                    macroAnalysis: ''
                };
                
                await updateWeeklySummary(weekKey, newData);
                
                setTimeout(() => {
                    window.location.reload();
                }, 100);
                
                alert('Meal plan optimized! Page will refresh to show changes.');
            } else {
                alert('Could not optimize meal plan. Please try again.');
            }
        } catch (error) {
            console.error('Error optimizing meal plan:', error);
            alert('Error optimizing meal plan.');
        } finally {
            setIsAnalyzingMacros(false);
        }
    }, [currentWeek, weeklyData, weekDays, weekKey, updateWeeklySummary, weeklySummaries]);

    // Generate shopping list
    const generateShoppingList = async () => {
        if(!weeklyData.meals || Object.keys(weeklyData.meals).length === 0) {
            alert('Please create a meal plan first');
            return;
        }
        
        setIsGeneratingList(true);
        
        const mealPlanText = Object.entries(weeklyData.meals).map(([day, meals]) => {
            const date = format(parseISO(day), 'EEEE');
            const mealEntries = Object.entries(meals)
                .filter(([mealType]) => mealType !== 'Notes')
                .map(([mealType, meal]) => meal ? `  ${mealType}: ${meal}` : null)
                .filter(Boolean)
                .join('\n');
            return `${date}:\n${mealEntries}`;
        }).join('\n\n');

        const stockText = weeklyData.foodStock || 'No items in stock';

        const prompt = `Create a shopping list with specific quantities and package sizes. Format as markdown with categories like "## Produce", "## Dairy & Eggs", etc. 

For each item:
- Item name
- Quantity needed (in servings/meals)
- Package size recommendation (e.g., "1 lb bag", "6-pack")

EXCLUDE items in stock with sufficient quantity.

**Meal Plan:**
${mealPlanText}

**Current Stock:**
${stockText}`;

        try {
            const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const shoppingList = result.candidates[0].content.parts[0].text;
                
                const isolatedUpdate = {
                    ...weeklyData,
                    shoppingList: shoppingList
                };
                
                await updateWeeklySummary(weekKey, isolatedUpdate);
                
                setTimeout(() => {
                    const textarea = textareaRefs.current['shoppingList'];
                    if (textarea && isEditingShoppingList) {
                        textarea.value = shoppingList;
                    }
                }, 50);
                
                setIsEditingShoppingList(false);
            } else {
                alert("Sorry, could not generate a shopping list.");
            }
        } catch(error) {
            alert("An error occurred while generating the shopping list.");
        } finally {
            setIsGeneratingList(false);
        }
    };

    // Analyze macros
    const analyzeMacros = async () => {
        if(!weeklyData.meals || Object.keys(weeklyData.meals).length === 0) {
            alert('Please create a meal plan first');
            return;
        }
        
        setIsAnalyzingMacros(true);
        
        const mealPlanText = Object.entries(weeklyData.meals).map(([day, meals]) => {
            const date = format(parseISO(day), 'EEEE');
            const mealEntries = Object.entries(meals)
                .filter(([mealType]) => mealType !== 'Notes')
                .map(([mealType, meal]) => meal ? `  ${mealType}: ${meal}` : null)
                .filter(Boolean)
                .join('\n');
            return `${date}:\n${mealEntries}`;
        }).join('\n\n');

        const targets = weeklyData.macroTargets;
        const prompt = `Analyze this weekly meal plan against macro targets:

## Daily Estimates
Format exactly: "Mon: 1800cal, 120p, 200c, 60f"

## Weekly Summary
Brief comparison to targets - how close are we?

## Quick Suggestions
Actionable improvements to meet targets

Use proper markdown with clear sections.

**Daily Targets:** ${targets.calories}cal, ${targets.protein}p, ${targets.carbs}c, ${targets.fat}f

**Meal Plan:**
${mealPlanText}`;

        try {
            const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const analysis = result.candidates[0].content.parts[0].text;
                setMacroAnalysis(analysis);
                
                const isolatedUpdate = {
                    ...weeklyData,
                    macroAnalysis: analysis
                };
                
                await updateWeeklySummary(weekKey, isolatedUpdate);
                
                // Parse daily macros for Notes
                const dailyMacroMatches = analysis.match(/(\w{3}):\s*(\d+)cal[^,]*,\s*(\d+)p[^,]*,\s*(\d+)c[^,]*,\s*(\d+)f/gi);
                if (dailyMacroMatches) {
                    const newDailyMacros = {};
                    dailyMacroMatches.forEach(match => {
                        const parts = match.match(/(\w{3}):\s*(\d+)cal[^,]*,\s*(\d+)p[^,]*,\s*(\d+)c[^,]*,\s*(\d+)f/i);
                        if (parts) {
                            const day = parts[1].toLowerCase();
                            newDailyMacros[day] = `📊 ${parts[2]}cal, ${parts[3]}p, ${parts[4]}c, ${parts[5]}f`;
                        }
                    });
                    setDailyMacros(newDailyMacros);
                    
                    // Update Notes textareas
                    setTimeout(() => {
                        weekDays.forEach(day => {
                            const dayKey = format(day, 'yyyy-MM-dd');
                            const dayAbbr = format(day, 'EEE').toLowerCase();
                            const macroInfo = newDailyMacros[dayAbbr] || '';
                            const userNotes = weeklyData.meals?.[dayKey]?.Notes || '';
                            const combinedContent = [macroInfo, userNotes].filter(Boolean).join('\n\n');
                            
                            const textarea = textareaRefs.current[`meal-${dayKey}-Notes`];
                            if (textarea) {
                                textarea.value = combinedContent;
                            }
                        });
                    }, 50);
                }
            } else {
                alert("Sorry, could not analyze macros.");
            }
        } catch(error) {
            alert("An error occurred while analyzing macros.");
        } finally {
            setIsAnalyzingMacros(false);
        }
    };

    // Render Notes cell
    const renderNotesCell = (day) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayAbbr = format(day, 'EEE').toLowerCase();
        const userNotes = weeklyData.meals?.[dayKey]?.Notes || '';
        const macroInfo = dailyMacros[dayAbbr] || '';
        
        const combinedContent = [macroInfo, userNotes].filter(Boolean).join('\n\n');
        const textareaId = `meal-${dayKey}-Notes`;
        
        return (
            <textarea
                ref={el => textareaRefs.current[textareaId] = el}
                id={textareaId}
                defaultValue={combinedContent}
                onChange={(e) => {
                    const { value } = e.target;
                    let newUserNotes = value;
                    if (macroInfo && value.startsWith(macroInfo)) {
                        newUserNotes = value.substring(macroInfo.length).replace(/^\n+/, '');
                    }
                    handleMealChange(day, 'Notes', newUserNotes, textareaId);
                }}
                className="w-full p-2 border border-gray-200 bg-gray-50 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize"
                rows="4"
                placeholder="Prep notes, reminders...&#10;&#10;Macro estimates will appear here after clicking 'Analyze'"
                style={{ minHeight: '100px' }}
            />
        );
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Meal Planner - Full height, no scrollbar */}
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Weekly Meal Plan</h2>
                    <div className="flex gap-2 flex-wrap">
                        <button 
                            onClick={copyFromPreviousWeek}
                            className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                        >
                            📋 Copy Last Week
                        </button>
                        <button 
                            onClick={resetMealPlan}
                            className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                            🗑️ Reset Plan
                        </button>
                        <button 
                            onClick={generateOptimizedMealPlan}
                            disabled={isAnalyzingMacros}
                            className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50 transition-colors disabled:text-purple-400"
                        >
                            {isAnalyzingMacros ? '🤖 Optimizing...' : '🤖 Optimize Last Week'}
                        </button>
                        <button 
                            onClick={inheritStockWithAdjustments}
                            className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                        >
                            📦 Inherit Stock
                        </button>
                    </div>
                </div>
                
                {/* Full height table with flex-1 */}
                <div className="flex-1 overflow-x-auto border border-gray-100 rounded-lg">
                    <table className="w-full border-collapse h-full">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr>
                                <th className="text-left p-2 font-semibold text-gray-600 w-16 border-b border-gray-200">Day</th>
                                {mealTypes.map(mealType => (
                                    <th key={mealType} className="text-left p-2 font-semibold text-gray-600 min-w-36 border-b border-gray-200">{mealType}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {weekDays.map(day => (
                                <tr key={day.toString()} className="border-t border-gray-100">
                                    <td className="p-2 font-medium text-gray-700 text-sm align-top">
                                        {format(day, 'EEE')}
                                    </td>
                                    {mealTypes.map(mealType => (
                                        <td key={mealType} className="p-1 relative align-top">
                                            {mealType === 'Notes' ? renderNotesCell(day) : (
                                                <textarea
                                                    ref={el => {
                                                        const textareaId = `meal-${format(day, 'yyyy-MM-dd')}-${mealType}`;
                                                        textareaRefs.current[textareaId] = el;
                                                    }}
                                                    id={`meal-${format(day, 'yyyy-MM-dd')}-${mealType}`}
                                                    defaultValue={weeklyData.meals?.[format(day, 'yyyy-MM-dd')]?.[mealType] || ''}
                                                    onChange={(e) => {
                                                        const { value } = e.target;
                                                        const textareaId = `meal-${format(day, 'yyyy-MM-dd')}-${mealType}`;
                                                        handleMealChange(day, mealType, value, textareaId);
                                                    }}
                                                    className="w-full p-2 border border-gray-200 bg-gray-50 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize"
                                                    rows="4"
                                                    placeholder={`Enter ${mealType.toLowerCase()}...`}
                                                    style={{ minHeight: '100px' }}
                                                />
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right Column - Stock, Macros, Shopping List */}
            <div className="xl:col-span-2 space-y-6">
                {/* Food Stock - WITH RESIZE HANDLE */}
                <div className="bg-green-50 rounded-2xl shadow-sm p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-green-900">Food Stock</h3>
                        <button 
                            onClick={() => toggleSection('foodStock')}
                            className="text-xs text-green-700 hover:text-green-900 px-2 py-1 rounded hover:bg-green-100 transition-colors"
                        >
                            {expandedSections.foodStock ? '📉 Collapse' : '📈 Expand'}
                        </button>
                    </div>
                    <textarea 
                        ref={el => textareaRefs.current['foodStock'] = el}
                        defaultValue={weeklyData.foodStock} 
                        onChange={(e) => handleFoodStockChange(e.target.value)}
                        placeholder="Enter what you have in stock and quantities (in servings)&#10;Example:&#10;• Chicken breast - 4 servings&#10;• Rice - 6 servings&#10;• Broccoli - 3 servings&#10;&#10;Click 'Inherit Stock' to populate from last week"
                        className={`w-full p-3 border border-green-200 bg-white rounded-lg focus:ring-2 focus:ring-green-500 resize text-xs transition-all ${
                            expandedSections.foodStock ? 'h-64' : 'h-32'
                        }`}
                    />
                </div>

                {/* Macro Targets - WITH RESIZE FOR ANALYSIS */}
                <div className="bg-blue-50 rounded-2xl shadow-sm p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-blue-900">Daily Macro Targets</h3>
                        <button 
                            onClick={analyzeMacros}
                            disabled={isAnalyzingMacros}
                            className="text-xs text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50 transition-colors disabled:text-blue-400"
                        >
                            {isAnalyzingMacros ? '...' : '📊 Analyze'}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-blue-700 mb-1">Calories</label>
                            <input 
                                type="number" 
                                value={weeklyData.macroTargets.calories}
                                onChange={(e) => handleMacroTargetChange('calories', e.target.value)}
                                className="w-full p-2 border border-blue-200 bg-white rounded text-sm focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-blue-700 mb-1">Protein (g)</label>
                            <input 
                                type="number" 
                                value={weeklyData.macroTargets.protein}
                                onChange={(e) => handleMacroTargetChange('protein', e.target.value)}
                                className="w-full p-2 border border-blue-200 bg-white rounded text-sm focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-blue-700 mb-1">Carbs (g)</label>
                            <input 
                                type="number" 
                                value={weeklyData.macroTargets.carbs}
                                onChange={(e) => handleMacroTargetChange('carbs', e.target.value)}
                                className="w-full p-2 border border-blue-200 bg-white rounded text-sm focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-blue-700 mb-1">Fat (g)</label>
                            <input 
                                type="number" 
                                value={weeklyData.macroTargets.fat}
                                onChange={(e) => handleMacroTargetChange('fat', e.target.value)}
                                className="w-full p-2 border border-blue-200 bg-white rounded text-sm focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    
                    {/* Macro Analysis Results - FIXED: Resize + Markdown */}
                    {(macroAnalysis || weeklyData.macroAnalysis) && (
                        <div className="mt-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex justify-between items-center p-2 border-b border-blue-100">
                                <span className="text-xs font-medium text-blue-800">Analysis Results</span>
                                <button 
                                    onClick={() => toggleSection('macroAnalysis')}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                    {expandedSections.macroAnalysis ? '📉' : '📈'}
                                </button>
                            </div>
                            <div className={`relative transition-all ${
                                expandedSections.macroAnalysis ? 'h-64' : 'h-32'
                            }`}>
                                {/* Hidden resizable textarea for resize functionality */}
                                <textarea
                                    className="absolute inset-0 w-full h-full resize opacity-0 pointer-events-none"
                                    style={{ minHeight: '128px' }}
                                />
                                {/* Visible markdown content */}
                                <div className="absolute inset-0 p-3 overflow-y-auto">
                                    <div className="prose prose-xs max-w-none text-xs">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({children}) => <p className="mb-3 leading-relaxed">{children}</p>,
                                                h2: ({children}) => <h2 className="text-sm font-bold mt-4 mb-2 text-blue-800">{children}</h2>,
                                                h3: ({children}) => <h3 className="text-sm font-semibold mt-3 mb-1 text-blue-700">{children}</h3>
                                            }}
                                        >
                                            {macroAnalysis || weeklyData.macroAnalysis}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                                {/* Resize handle overlay */}
                                <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-blue-200 opacity-50 hover:opacity-100" 
                                     style={{ clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)' }}></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Shopping List - FIXED: Resize + Markdown */}
                <div className="bg-orange-50 rounded-2xl shadow-sm p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-orange-900">Shopping List</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={generateShoppingList} 
                                disabled={isGeneratingList} 
                                className="text-xs text-orange-700 hover:text-orange-900 px-2 py-1 rounded hover:bg-orange-50 transition-colors disabled:text-orange-400"
                            >
                                {isGeneratingList ? '...' : '🛒 Generate'}
                            </button>
                            <button 
                                onClick={() => setIsEditingShoppingList(!isEditingShoppingList)}
                                className="text-xs text-orange-700 hover:text-orange-900 px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                            >
                                ✏️ {isEditingShoppingList ? 'View' : 'Edit'}
                            </button>
                            <button 
                                onClick={() => toggleSection('shoppingList')}
                                className="text-xs text-orange-700 hover:text-orange-900 px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                            >
                                {expandedSections.shoppingList ? '📉' : '📈'}
                            </button>
                        </div>
                    </div>
                    
                    {/* FIXED: Resize + Markdown support */}
                    <div className={`bg-white rounded-lg border border-orange-200 relative transition-all ${
                        expandedSections.shoppingList ? 'h-80' : 'h-64'
                    }`}>
                        {isEditingShoppingList ? (
                            <textarea 
                                ref={el => textareaRefs.current['shoppingList'] = el}
                                defaultValue={weeklyData.shoppingList}
                                onChange={(e) => handleShoppingListChange(e.target.value)}
                                className="w-full h-full p-3 border-0 bg-transparent focus:ring-0 resize text-sm rounded-lg"
                                placeholder="Add your shopping list items here...&#10;&#10;Click 'Generate' to create from meal plan"
                                style={{ minHeight: '256px' }}
                            />
                        ) : (
                            <>
                                {/* Hidden resizable textarea for resize functionality */}
                                <textarea
                                    className="absolute inset-0 w-full h-full resize opacity-0 pointer-events-none"
                                    style={{ minHeight: '256px' }}
                                />
                                {/* Visible markdown content */}
                                <div className="absolute inset-0 p-3 overflow-y-auto">
                                    <div className="prose prose-sm max-w-none text-xs">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({children}) => <p className="mb-2 leading-relaxed">{children}</p>,
                                                h2: ({children}) => <h2 className="text-sm font-bold mt-3 mb-2 text-orange-800">{children}</h2>,
                                                ul: ({children}) => <ul className="ml-4 mb-2">{children}</ul>,
                                                li: ({children}) => <li className="mb-1">{children}</li>
                                            }}
                                        >
                                            {weeklyData.shoppingList || "Click 'Generate' to create a shopping list based on your meal plan and stock."}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                                {/* Resize handle overlay */}
                                <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-orange-200 opacity-50 hover:opacity-100" 
                                     style={{ clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)' }}></div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
