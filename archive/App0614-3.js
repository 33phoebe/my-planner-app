/* global __app_id, __initial_auth_token, __firebase_config */
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getFirestore, collection, doc, addDoc, getDocs, setDoc, deleteDoc, onSnapshot, query, where, writeBatch } from "firebase/firestore";
import { DndProvider, useDrag, useDrop} from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ReactMarkdown from 'react-markdown';
import { startOfWeek, endOfWeek, addDays, format, eachDayOfInterval, isSameDay, parseISO, addWeeks, subWeeks, isBefore, startOfToday, startOfMonth, endOfMonth, eachWeekOfInterval, getYear, setYear, getMonth, addMonths, subMonths, isToday, startOfYear } from 'date-fns';
import remarkGfm from 'remark-gfm';
import * as XLSX from 'xlsx';

// --- ICONS (Heroicons & Custom) ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m1-15h.01M17 3h.01M17 17h.01M19 5h.01M19 17h.01M12 9a3 3 0 100-6 3 3 0 000 6z" /></svg>;
const RepeatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const SidebarOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>;
const SidebarCloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>;

const GoalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
       <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
       <circle cx="12" cy="12" r="9" stroke="#a855f7"></circle>
       <circle cx="12" cy="12" r="5" stroke="#ec4899"></circle>
       <circle cx="12" cy="12" r="1" fill="#f43f5e" stroke="none"></circle>
    </svg>
);

const ParkingLotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="#2dd4bf" />
        <path d="M4 13h3l3 3h4l3 -3h3" stroke="#14b8a6" />
    </svg>
);


const ItemTypes = {
  TASK: 'task',
};

// --- FIREBASE CONFIG ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : {
        apiKey: "AIzaSyBm3XTkUXEMkan_L5fQCdtdMJdjujBqsEo",
        authDomain: "my-planner-app-b7ef0.firebaseapp.com",
        projectId: "my-planner-app-b7ef0",
        storageBucket: "my-planner-app-b7ef0.appspot.com",
        messagingSenderId: "595505503069",
        appId: "1:595505503069:web:7c23b3ece54c8272cc26b4",
        measurementId: "G-H63KXHF1WR"
      };

const app = initializeApp(firebaseConfig);
try {
    getAnalytics(app);
} catch (e) {
    console.error("Firebase Analytics not supported in this environment.");
}

const db = getFirestore(app);
const auth = getAuth(app);

// --- AUTHENTICATION CONTEXT ---
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const authToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (authToken) {
                    await signInWithCustomToken(auth, authToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication error:", error);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        initializeAuth();
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- DATA CONTEXT ---
const DataContext = createContext();

const DataProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [goals, setGoals] = useState([]);
    const [weeklySummaries, setWeeklySummaries] = useState({});
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    const getCollectionPath = useCallback((collectionName) => {
        const userId = user?.uid || 'anonymous';
        return `/artifacts/${appId}/users/${userId}/${collectionName}`;
    }, [user, appId]);

    useEffect(() => {
        if (!user) return;

        const tasksCollectionPath = getCollectionPath('tasks');
        const qTasks = query(collection(db, tasksCollectionPath));
        const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTasks(tasksData);
        });

        const goalsCollectionPath = getCollectionPath('goals');
        const qGoals = query(collection(db, goalsCollectionPath));
        const unsubscribeGoals = onSnapshot(qGoals, (snapshot) => {
            const goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGoals(goalsData);
        });

        const weeklySummariesCollectionPath = getCollectionPath('weeklySummaries');
        const unsubscribeSummaries = onSnapshot(query(collection(db, weeklySummariesCollectionPath)), (snapshot) => {
            const summaries = {};
            snapshot.forEach(doc => {
                summaries[doc.id] = doc.data();
            });
            setWeeklySummaries(summaries);
        });
        
        return () => {
            unsubscribeTasks();
            unsubscribeGoals();
            unsubscribeSummaries();
        };
    }, [user, getCollectionPath]);
    
    // --- TASK OPERATIONS ---
    const addTask = async (taskData) => {
      if (!user) return;
        const tasksCollectionPath = getCollectionPath('tasks');
        if (taskData.recurring) {
            await addRecurringTasks(taskData);
        } else {
            await addDoc(collection(db, tasksCollectionPath), { ...taskData, description: taskData.description || '', dueDate: taskData.dueDate ? taskData.dueDate.toISOString() : null });
        }
    };
    
    const updateTask = async (taskId, updatedData) => {
        if (!user) return;
        const taskDocPath = doc(db, getCollectionPath('tasks'), taskId);
        
        const dataToUpdate = { ...updatedData };
        
        if(dataToUpdate.hasOwnProperty('dueDate')){
             if (dataToUpdate.dueDate instanceof Date) {
                dataToUpdate.dueDate = dataToUpdate.dueDate.toISOString();
            } else if (typeof dataToUpdate.dueDate === 'string' && dataToUpdate.dueDate) {
                try {
                    dataToUpdate.dueDate = parseISO(dataToUpdate.dueDate).toISOString();
                } catch(e) {
                    console.error("Error parsing date on update: ", dataToUpdate.dueDate);
                    delete dataToUpdate.dueDate;
                }
            } else {
                 dataToUpdate.dueDate = null;
            }
        }
        
        await setDoc(taskDocPath, dataToUpdate, { merge: true });
    };

    const deleteTask = async (taskId) => {
        if (!user) return;
        const taskDocPath = doc(db, getCollectionPath('tasks'), taskId);
        await deleteDoc(taskDocPath);
    };

    const deleteTaskSeries = async (seriesId) => {
        if (!user) return;
        const tasksCollectionPath = getCollectionPath('tasks');
        const q = query(collection(db, tasksCollectionPath), where("seriesId", "==", seriesId));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    };


    const addRecurringTasks = async (taskData) => {
        if (!user) return;
        const { title, recurring, estimatedTime, startDate } = taskData;
        const { endDate } = recurring;

        if (!startDate || !endDate) {
            console.error("Start date or end date is missing for recurring task.");
            return;
        }

        const seriesId = `series-${Date.now()}`;
        const batch = writeBatch(db);
        const tasksCollectionPath = getCollectionPath('tasks');

        let current;
        try {
           current = parseISO(startDate);
        } catch(e) {
            console.error("Invalid start date for recurring task: ", startDate);
            return;
        }

        const end = parseISO(endDate);

        while (current <= end) {
            const newTask = {
                title,
                estimatedTime,
                actualTime: estimatedTime || 0, // CHANGE: Default actualTime to estimatedTime
                completed: false,
                description: '',
                dueDate: current.toISOString(),
                isHabit: true,
                seriesId,
                recurring: true, 
            };
            const newDocRef = doc(collection(db, tasksCollectionPath));
            batch.set(newDocRef, newTask);

            switch (recurring.frequency) {
                case 'daily':
                    current = addDays(current, 1);
                    break;
                case 'weekly':
                    current = addDays(current, 7);
                    break;
                case 'monthly':
                    current = addMonths(current, 1);
                    break;
                default:
                    return;
            }
        }
        await batch.commit();
    };

    const rolloverIncompleteTasks = useCallback(async () => {
        if (!user) return;
        const today = startOfToday();
        const batch = writeBatch(db);
        const tasksToRollover = tasks.filter(task => 
            !task.completed && 
            !task.isHabit && // *** Exclude habits from rollover ***
            task.dueDate && 
            isBefore(parseISO(task.dueDate), today)
        );

        tasksToRollover.forEach(task => {
            const taskDocRef = doc(db, getCollectionPath('tasks'), task.id);
            batch.update(taskDocRef, { dueDate: today.toISOString() });
        });
        
        if (tasksToRollover.length > 0) {
            await batch.commit();
        }
    }, [tasks, user, getCollectionPath]);
    
    useEffect(() => {
        rolloverIncompleteTasks();
        const interval = setInterval(rolloverIncompleteTasks, 3600000); // Check every hour
        return () => clearInterval(interval);
    }, [rolloverIncompleteTasks]);


    // --- GOAL OPERATIONS ---
    const addGoal = async (goalData) => {
        if (!user) return;
        const goalsCollectionPath = getCollectionPath('goals');
        await addDoc(collection(db, goalsCollectionPath), goalData);
    };

    const updateGoal = async (goalId, updatedData) => {
        if (!user) return;
        const goalDocPath = doc(db, getCollectionPath('goals'), goalId);
        await setDoc(goalDocPath, updatedData, { merge: true });
    };

    const deleteGoal = async (goalId) => {
        if (!user) return;
        const goalDocPath = doc(db, getCollectionPath('goals'), goalId);
        await deleteDoc(goalDocPath);
    };
    
    // --- WEEKLY SUMMARY OPERATIONS ---
    const updateWeeklySummary = async (weekStartDate, summaryData) => {
        if (!user) return;
        const weeklySummaryDocPath = doc(db, getCollectionPath('weeklySummaries'), weekStartDate);
        await setDoc(weeklySummaryDocPath, summaryData, { merge: true });
    };

    const updateHabitSeries = async (seriesId, updates) => {
        const tasksCollectionPath = getCollectionPath('tasks');
        const q = query(collection(db, tasksCollectionPath), where("seriesId", "==", seriesId), where("completed", "==", false));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach(doc => {
            batch.update(doc.ref, updates);
        });
        await batch.commit();
    };
    
    return (
        <DataContext.Provider value={{
            tasks, addTask, updateTask, deleteTask, deleteTaskSeries, updateHabitSeries,
            goals, addGoal, updateGoal, deleteGoal,
            weeklySummaries, updateWeeklySummary
        }}>
            {children}
        </DataContext.Provider>
    );
};


// --- COMPONENTS ---

const TaskDetailModal = ({ task, onClose }) => {
    const { updateTask, deleteTask, deleteTaskSeries } = useContext(DataContext);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState({...task, dueDate: task.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : ''});
    const [showConfirm, setShowConfirm] = useState({ show: false, type: null });

    const handleSave = () => {
        updateTask(task.id, {...editedTask, dueDate: editedTask.dueDate ? parseISO(editedTask.dueDate) : null});
        setIsEditing(false);
    };
    
    const confirmDelete = (type) => {
        setShowConfirm({ show: false, type: null });
        if(type === 'task') {
            deleteTask(task.id);
            onClose();
        } else if(type === 'series') {
            deleteTaskSeries(task.seriesId);
            onClose();
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedTask(prev => ({...prev, [name]: value}));
    }

    const ConfirmationDialog = () => (
         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex justify-center items-center rounded-2xl">
            <div className="p-6 bg-white rounded-xl shadow-2xl border text-center">
                <p className="font-semibold mb-4">Are you sure?</p>
                <div className="flex space-x-2">
                    <button onClick={() => setShowConfirm({show: false, type: null})} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                    <button onClick={() => confirmDelete(showConfirm.type)} className="py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg relative">
                {showConfirm.show && <ConfirmationDialog />}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">&times;</button>
                {isEditing ? (
                    <div className="space-y-4">
                        <input type="text" name="title" value={editedTask.title} onChange={handleChange} className="w-full text-2xl font-bold p-2 border rounded-lg" />
                        <textarea name="description" value={editedTask.description} onChange={handleChange} placeholder="Add description, links, or notes..." className="w-full p-2 border rounded-lg h-32"></textarea>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Due Date</label>
                                <input type="date" name="dueDate" value={editedTask.dueDate} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Estimated Time (min)</label>
                                <input type="number" name="estimatedTime" value={editedTask.estimatedTime} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Actual Time (min)</label>
                                <input type="number" name="actualTime" value={editedTask.actualTime || 0} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                             <button onClick={() => setIsEditing(false)} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                             <button onClick={handleSave} className="py-2 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700">Save Changes</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                         <h2 className="text-2xl font-bold text-gray-800">{task.title}</h2>
                         <p className="text-gray-600 whitespace-pre-wrap min-h-[50px]">{task.description || "No description provided."}</p>
                         <div className="flex space-x-8 text-sm">
                             <p><strong>Due:</strong> {task.dueDate ? format(parseISO(task.dueDate), 'MMM d, yyyy') : 'N/A'}</p>
                             <p><strong>Est. Time:</strong> {task.estimatedTime} min</p>
                             <p><strong>Actual Time:</strong> {task.actualTime || 0} min</p>
                         </div>
                         <div className="flex justify-between items-center pt-4 border-t">
                            <div>
                                <button onClick={() => setIsEditing(true)} className="py-2 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700">Edit Task</button>
                            </div>
                            <div className="flex space-x-2">
                               {task.recurring && <button onClick={() => setShowConfirm({ show: true, type: 'series' })} className="py-2 px-4 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200">Delete Series</button>}
                               <button onClick={() => setShowConfirm({ show: true, type: 'task' })} className="py-2 px-4 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200">Delete Task</button>
                            </div>
                         </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const HabitManagerModal = ({ seriesId, onClose }) => {
    const { tasks, updateHabitSeries, addRecurringTasks } = useContext(DataContext);
    const [newEndDate, setNewEndDate] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newDescription, setNewDescription] = useState('');

    const handleExtend = async () => {
        if (!newEndDate) return;
        
        const seriesTasks = tasks.filter(t => t.seriesId === seriesId);
        if (seriesTasks.length === 0) return;

        const lastTask = seriesTasks.sort((a,b) => parseISO(b.dueDate) - parseISO(a.dueDate))[0];
        
        const newRecurringTask = {
            ...lastTask,
            recurring: { ...lastTask.recurring, endDate: newEndDate },
            startDate: format(addDays(parseISO(lastTask.dueDate), 1), 'yyyy-MM-dd')
        };
        await addRecurringTasks(newRecurringTask);
        onClose();
    };

    const handlePush = async () => {
        if(!newStartDate) return;
        alert("Pushing start dates is a complex operation and has been simplified for this demo.");
        onClose();
    };

    const handleUpdateDescription = async () => {
        if(!newDescription) return;
        await updateHabitSeries(seriesId, { description: newDescription });
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Manage Habit Series</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Extend End Date</label>
                        <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} className="w-full p-2 border rounded-lg" />
                        <button onClick={handleExtend} className="mt-2 w-full py-2 px-4 bg-teal-600 text-white rounded-lg">Extend</button>
                    </div>
                    <div className="opacity-50 cursor-not-allowed">
                        <label className="block text-sm font-medium text-gray-700">Push Back Start Date (from first incomplete)</label>
                        <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className="w-full p-2 border rounded-lg" disabled />
                        <button onClick={handlePush} className="mt-2 w-full py-2 px-4 bg-teal-600 text-white rounded-lg" disabled>Push</button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Update Description for Future Habits</label>
                        <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} className="w-full p-2 border rounded-lg h-24"></textarea>
                        <button onClick={handleUpdateDescription} className="mt-2 w-full py-2 px-4 bg-teal-600 text-white rounded-lg">Update Description</button>
                    </div>
                </div>
                 <div className="flex justify-end pt-4 mt-4 border-t">
                    <button onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Close</button>
                 </div>
            </div>
        </div>
    )
}
// Enhanced Task component with original drag preview and direct editing
const Task = ({ task, compact = false, showDragHandle = true, allowEdit = true }) => {
    const { updateTask } = useContext(DataContext);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showHabitManager, setShowHabitManager] = useState(false);

    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.TASK,
        item: { 
            id: task.id, 
            dueDate: task.dueDate, 
            title: task.title,
            isHabit: task.isHabit,
            estimatedTime: task.estimatedTime,
            originalDueDate: task.dueDate
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    const handleToggleComplete = (e) => {
        e.stopPropagation();
        updateTask(task.id, { completed: !task.completed });
    };

    const handleTaskClick = () => {
        if (allowEdit) {
            setShowDetailModal(true);
        }
    };

    // Compact style for monthly view
    if (compact) {
        return (
            <>
                <div 
                    ref={drag}
                    onClick={handleTaskClick}
                    className={`group relative cursor-pointer transition-all duration-200 ${
                        isDragging ? 'opacity-50 scale-95 rotate-2 translate-x-1' : 'opacity-100'
                    }`}
                >
                    <div className={`text-[10px] px-1.5 py-0.5 rounded truncate transition-all hover:shadow-sm ${
                        task.completed 
                            ? 'bg-green-100 text-green-700 line-through' 
                            : task.isHabit 
                                ? 'bg-violet-100 text-violet-800 hover:bg-violet-200' 
                                : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                    }`}>
                        {task.title}
                    </div>
                </div>
                {showDetailModal && <TaskDetailModal task={task} onClose={() => setShowDetailModal(false)} />}
                {showHabitManager && task.isHabit && <HabitManagerModal seriesId={task.seriesId} onClose={() => setShowHabitManager(false)} />}
            </>
        );
    }

    // Full size for weekly view and task list
    return (
        <>
            <div 
                ref={drag}
                onClick={handleTaskClick}
                className={`group relative p-1.5 rounded-lg shadow-sm mb-2 transition-all duration-200 border-l-4 cursor-pointer ${
                    task.completed ? 'bg-green-100 text-gray-500 line-through border-green-400' : 'bg-white hover:bg-gray-50'
                } ${
                    task.isHabit ? 'border-violet-400' : 'border-orange-400'
                } ${
                    isDragging ? 'opacity-50 scale-105 shadow-lg rotate-1 translate-x-2' : 'opacity-100'
                }`}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center flex-grow min-w-0">
                        <input 
                            type="checkbox" 
                            checked={task.completed} 
                            onChange={handleToggleComplete} 
                            onClick={(e) => e.stopPropagation()} 
                            className={`h-4 w-4 rounded-full border-gray-300 focus:ring-0 focus:ring-offset-0 transition-all ${
                                task.isHabit ? 'text-violet-500' : 'text-orange-500'
                            }`} 
                        />
                        <span className="ml-2 font-medium text-xs text-gray-800 line-clamp-2">
                            {task.title}
                        </span>
                    </div>
                    
                    {/* Drag handle */}
                    {showDragHandle && (
                        <div 
                            className="opacity-0 group-hover:opacity-100 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                            onClick={(e) => e.stopPropagation()}
                            title="Drag to move"
                        >
                            ⋮⋮
                        </div>
                    )}
                    
                    {task.isHabit && (
                        <button 
                            onClick={(e) => {e.stopPropagation(); setShowHabitManager(true)}} 
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-full text-xs text-violet-600 font-semibold"
                        >
                            ...
                        </button>
                    )}
                    
                    {task.estimatedTime && (
                        <span className="ml-2 text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            {task.estimatedTime}m
                        </span>
                    )}
                </div>
                
                {task.description && (
                    <p className="text-xs text-gray-500 mt-1 ml-6 truncate" title={task.description}>
                        {task.description}
                    </p>
                )}
            </div>
            
            {showDetailModal && <TaskDetailModal task={task} onClose={() => setShowDetailModal(false)} />}
            {showHabitManager && task.isHabit && <HabitManagerModal seriesId={task.seriesId} onClose={() => setShowHabitManager(false)} />}
        </>
    );
};


// Enhanced DayColumn with undo support
const DayColumn = ({ day, tasks }) => {
    const { updateTask } = useContext(DataContext);
    const { addUndoAction } = useContext(UndoContext);

    const regularTasks = tasks.filter(t => !t.isHabit);
    const habits = tasks.filter(t => t.isHabit);

    const [{ isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.TASK,
        drop: (item) => {
            const originalDate = item.originalDueDate;
            addUndoAction({
                description: `Moved "${item.title}" to ${format(day, 'MMM d')}`,
                undo: () => updateTask(item.id, { dueDate: originalDate ? parseISO(originalDate) : null })
            });
            updateTask(item.id, { dueDate: day });
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));
    
    return (
        <div ref={drop} className={`flex-1 p-3 bg-white rounded-xl min-h-[400px] transition-colors ${isOver ? 'bg-teal-100' : ''}`}>
            <div className="text-center mb-4">
                <h3 className="font-semibold text-gray-500">{format(day, 'EEE')}</h3>
                <p className={`font-bold text-2xl ${isToday(day) ? 'text-teal-600' : 'text-gray-800'}`}>{format(day, 'd')}</p>
            </div>
            <div className="space-y-2">
                 {regularTasks.map(task => <Task key={task.id} task={task} compact={false}/>)}
            </div>

            {habits.length > 0 && (
                <>
                    <div className="my-4 relative text-center">
                        <hr className="border-dashed border-gray-300"/>
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs text-gray-500 font-medium tracking-wider uppercase">Habits</span>
                    </div>
                    <div className="space-y-2">
                         {habits.map(habit => <Task key={habit.id} task={habit} compact={false}/>)}
                    </div>
                </>
            )}
        </div>
    );
};

const CalendarView = ({ currentDate }) => {
    const { tasks } = useContext(DataContext);
    const [showModal, setShowModal] = useState(false);
    const [modalDate, setModalDate] = useState(null);
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const handleAddTaskClick = (date) => {
        setModalDate(date);
        setShowModal(true);
    };

    return (
        <div className="flex flex-col xl:flex-row gap-6">
            <div className={`transition-all duration-300 ${isSidebarOpen ? 'w-full xl:w-2/3' : 'w-full'}`}>
                 <div className="grid grid-cols-7 gap-4">
                    {weekDays.map(day => (
                        <div key={day.toString()} className="flex flex-col">
                           <DayColumn 
                                day={day} 
                                tasks={tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), day))}
                            />
                            <button onClick={() => handleAddTaskClick(day)} className="mt-2 flex-shrink-0 flex items-center justify-center p-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">
                                <PlusIcon />
                            </button>
                        </div>
                    ))}
                </div>
                 <div className="mt-6">
                    <MealPlanner currentWeek={currentDate} />
                 </div>
            </div>
             <div className={`transition-all duration-300 ${isSidebarOpen ? 'w-full xl:w-1/3' : 'w-0 overflow-hidden'}`}>
                <div className="space-y-6">
                    <AISummary timeframe="week" startDate={weekStart} endDate={weekEnd} />
                    <WeeklyNotes currentWeek={currentDate} />
                </div>
            </div>
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="fixed right-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-lg z-20">
                {isSidebarOpen ? <SidebarCloseIcon /> : <SidebarOpenIcon/>}
            </button>
             {showModal && <CreateTaskModal date={modalDate} onClose={() => setShowModal(false)} />}
        </div>
    );
};

const CreateTaskModal = ({ onClose, date, initialData }) => {
    const { addTask } = useContext(DataContext);
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [estimatedTime, setEstimatedTime] = useState(initialData?.estimatedTime || 30);
    const [isHabit, setIsHabit] = useState(false);
    const [dueDate, setDueDate] = useState(initialData?.dueDate || (date ? format(date, 'yyyy-MM-dd') : ''));
    const [recurringOptions, setRecurringOptions] = useState({
        frequency: 'daily',
        endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    });
    
    useEffect(() => {
        if(initialData) {
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            setEstimatedTime(initialData.estimatedTime || 30);
            setDueDate(initialData.dueDate || '');
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // CHANGE: Parse estimatedTime to ensure it's a number
        const parsedEstimatedTime = parseInt(estimatedTime, 10) || 0;
        const taskData = {
            title,
            description,
            estimatedTime: parsedEstimatedTime,
            actualTime: parsedEstimatedTime, // CHANGE: Default actualTime to estimatedTime
            completed: false,
            dueDate: dueDate ? parseISO(dueDate) : null,
            isHabit,
            recurring: isHabit ? recurringOptions : null,
            startDate: dueDate ? dueDate : format(new Date(), 'yyyy-MM-dd'),
        };
        addTask(taskData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Create a New Item</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 h-24" placeholder="(Optional) Add notes, links..."></textarea>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Due Date</label>
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Estimated Time (minutes)</label>
                        <input type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                    </div>
                    <div className="pt-2">
                        <label className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <input type="checkbox" checked={isHabit} onChange={(e) => setIsHabit(e.target.checked)} className="h-5 w-5 rounded text-violet-600 border-gray-300 focus:ring-violet-500" />
                            <span className="ml-3 font-medium text-gray-700">This is a recurring habit</span>
                        </label>
                    </div>
                    {isHabit && (
                        <div className="p-4 bg-gray-100 rounded-lg space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Frequency</label>
                                <select value={recurringOptions.frequency} onChange={(e) => setRecurringOptions({...recurringOptions, frequency: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
                                <input type="date" value={recurringOptions.endDate} onChange={(e) => setRecurringOptions({...recurringOptions, endDate: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                        <button type="submit" className="py-2 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors">Create Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CollapsibleSection = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="space-y-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
            >
                <span className="flex items-center font-semibold text-lg text-gray-700">
                    {icon}
                    {title}
                </span>
                <div className={`transform transition-transform duration-200 text-gray-500 group-hover:text-gray-700 ${isOpen ? 'rotate-90' : ''}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </button>
            {isOpen && <div>{children}</div>}
        </div>
    );
};

// Fixed TaskList with proper habit filtering and collapsible sections
const TaskList = () => {
    const { tasks, updateTask } = useContext(DataContext);
    const { addUndoAction } = useContext(UndoContext);
    
    const completedTasks = tasks
        .filter(t => t.completed)
        .sort((a,b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return parseISO(b.dueDate) - parseISO(a.dueDate);
        });
        
    // Scheduled tasks should NOT include habits
    const scheduledTasks = tasks
        .filter(t => !t.completed && t.dueDate && !t.isHabit)
        .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
        
    // Only show non-habit tasks in parking lot
    const parkingLotTasks = tasks.filter(t => !t.completed && !t.dueDate && !t.isHabit);
    
    // Separate section for habits (both scheduled and unscheduled)
    const allHabits = tasks.filter(t => t.isHabit && !t.completed);

    // Droppable zone component with undo support
    const DroppableZone = ({ onDrop, children, isEmpty, emptyMessage, className = "", accentColor = "teal" }) => {
        const [{ isOver }, drop] = useDrop(() => ({
            accept: ItemTypes.TASK,
            drop: (item) => {
                const originalDate = item.originalDueDate;
                onDrop(item, originalDate);
            },
            collect: (monitor) => ({
                isOver: !!monitor.isOver(),
            }),
        }));

        const colorClasses = {
            teal: 'bg-teal-50 border-teal-300 text-teal-600',
            violet: 'bg-violet-50 border-violet-300 text-violet-600',
            green: 'bg-green-50 border-green-300 text-green-600',
            orange: 'bg-orange-50 border-orange-300 text-orange-600'
        };

        return (
            <div 
                ref={drop}
                className={`min-h-[80px] transition-all duration-200 rounded-lg ${
                    isOver ? `border-2 border-dashed ${colorClasses[accentColor]}` : 'border border-gray-200'
                } ${className}`}
            >
                {isEmpty && isOver ? (
                    <div className={`flex items-center justify-center h-24 font-medium ${colorClasses[accentColor].split(' ')[2]}`}>
                        Drop task here
                    </div>
                ) : isEmpty ? (
                    <div className="flex items-center justify-center h-24">
                        <p className="text-sm text-gray-400">{emptyMessage}</p>
                    </div>
                ) : (
                    <div className="p-4">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    const StatCard = ({ title, count, color = "gray" }) => {
        const colors = {
            gray: "bg-gray-100 text-gray-600",
            blue: "bg-blue-100 text-blue-600", 
            green: "bg-green-100 text-green-600",
            violet: "bg-violet-100 text-violet-600"
        };
        
        return (
            <div className={`px-4 py-2 rounded-lg ${colors[color]}`}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs font-medium uppercase tracking-wide">{title}</div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Task Dashboard</h2>
                <div className="flex gap-3">
                    <StatCard title="Scheduled" count={scheduledTasks.length} color="blue" />
                    <StatCard title="Unscheduled" count={parkingLotTasks.length} color="gray" />
                    <StatCard title="Habits" count={allHabits.length} color="violet" />
                    <StatCard title="Completed" count={completedTasks.length} color="green" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scheduled Tasks */}
                <CollapsibleSection 
                    title="Scheduled Tasks" 
                    icon={<div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>}
                    defaultOpen={false}
                >
                    <DroppableZone
                        onDrop={(item, originalDate) => {
                            const newDate = item.dueDate ? parseISO(item.dueDate) : new Date();
                            addUndoAction({
                                description: `Moved "${item.title}" to scheduled tasks`,
                                undo: () => updateTask(item.id, { dueDate: originalDate ? parseISO(originalDate) : null })
                            });
                            updateTask(item.id, { dueDate: newDate });
                        }}
                        isEmpty={scheduledTasks.length === 0}
                        emptyMessage="No scheduled tasks yet"
                        accentColor="teal"
                        className="bg-blue-50"
                    >
                        <div className="space-y-2">
                            {scheduledTasks.map(task => <Task key={task.id} task={task}/>)}
                        </div>
                    </DroppableZone>
                </CollapsibleSection>

                {/* Unscheduled Tasks */}
                <CollapsibleSection 
                    title="Unscheduled Tasks" 
                    icon={<ParkingLotIcon/>}
                    defaultOpen={false}
                >
                    <DroppableZone
                        onDrop={(item, originalDate) => {
                            addUndoAction({
                                description: `Moved "${item.title}" to unscheduled`,
                                undo: () => updateTask(item.id, { dueDate: originalDate ? parseISO(originalDate) : null })
                            });
                            updateTask(item.id, { dueDate: null });
                        }}
                        isEmpty={parkingLotTasks.length === 0}
                        emptyMessage="No unscheduled tasks"
                        accentColor="orange"
                        className="bg-gray-50"
                    >
                        <div className="space-y-2">
                            {parkingLotTasks.map(task => <Task key={task.id} task={task}/>)}
                        </div>
                    </DroppableZone>
                </CollapsibleSection>
            </div>

            {/* Habits Section */}
            {allHabits.length > 0 && (
                <CollapsibleSection 
                    title="All Habits" 
                    icon={<div className="w-3 h-3 bg-violet-500 rounded-full mr-2"></div>}
                    defaultOpen={false}
                >
                    <DroppableZone
                        isEmpty={false}
                        accentColor="violet"
                        className="bg-violet-50"
                    >
                        <div className="space-y-2">
                            {allHabits.map(habit => <Task key={habit.id} task={habit}/>)}
                        </div>
                    </DroppableZone>
                </CollapsibleSection>
            )}

            {/* Completed Tasks */}
            <CollapsibleSection 
                title="Completed Tasks" 
                icon={<div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>}
                defaultOpen={false}
            >
                <DroppableZone
                    onDrop={() => {
                        // Don't allow dropping into completed
                    }}
                    isEmpty={completedTasks.length === 0}
                    emptyMessage="No completed tasks yet"
                    accentColor="green"
                    className="bg-green-50"
                >
                    <div className="space-y-2">
                        {completedTasks.map(task => <Task key={task.id} task={task} showDragHandle={false}/>)}
                    </div>
                </DroppableZone>
            </CollapsibleSection>
        </div>
    );
};

const GoalBreakdownModal = ({ goalText, tasks, onClose, onAddTasks }) => {
    const [selectedTasks, setSelectedTasks] = useState([]);

    const handleToggleTask = (taskText) => {
        setSelectedTasks(prev => 
            prev.includes(taskText) ? prev.filter(t => t !== taskText) : [...prev, taskText]
        );
    };

    const handleSelectAll = () => {
        if (selectedTasks.length === tasks.length) {
            setSelectedTasks([]);
        } else {
            setSelectedTasks([...tasks]);
        }
    };

    const handleAdd = () => {
        onAddTasks(selectedTasks);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Suggested Tasks</h2>
                <p className="text-gray-600 mb-4">For your goal: "{goalText}"</p>
                
                <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-600">{selectedTasks.length} of {tasks.length} selected</span>
                    <button 
                        onClick={handleSelectAll}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                    >
                        {selectedTasks.length === tasks.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {tasks.map((task, index) => (
                        <label key={index} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={selectedTasks.includes(task)}
                                onChange={() => handleToggleTask(task)} 
                                className="h-5 w-5 rounded text-teal-600 border-gray-300 focus:ring-teal-500" 
                            />
                            <span className="ml-3 font-medium text-gray-700">{task}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                    <button onClick={handleAdd} className="py-2 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:bg-teal-300" disabled={selectedTasks.length === 0}>Add Selected Tasks</button>
                </div>
            </div>
        </div>
    );
};

const GoalsView = () => {
    const { goals, addGoal, updateGoal, deleteGoal, addTask } = useContext(DataContext);
    const [newGoal, setNewGoal] = useState('');
    const [loadingBreakdown, setLoadingBreakdown] = useState(null);
    const [breakdownModal, setBreakdownModal] = useState({ show: false, goalText: '', tasks: [] });

    const handleAddGoal = () => {
        if (newGoal.trim() === '') return;
        addGoal({ text: newGoal, completed: false });
        setNewGoal('');
    };

    const breakDownGoal = async (goal) => {
        setLoadingBreakdown(goal.id);
        const prompt = `Break down the following high-level goal into a short list of small, actionable tasks. Return the tasks as a JSON object with a single key "tasks" which is an array of strings.\n\nGoal: "${goal.text}"`;
        
        try {
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
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
                const parsed = JSON.parse(result.candidates[0].content.parts[0].text);
                setBreakdownModal({ show: true, goalText: goal.text, tasks: parsed.tasks || [] });
            } else {
                console.error("Goal Breakdown Error: Invalid response structure", result);
                alert("Sorry, I couldn't break down that goal.");
            }
        } catch(error) {
            console.error("Goal Breakdown Error:", error);
            alert("An error occurred while breaking down the goal.");
        } finally {
            setLoadingBreakdown(null);
        }
    };

    const addBrokenDownTasks = (tasksToAdd) => {
        tasksToAdd.forEach(taskTitle => {
            addTask({
                title: taskTitle,
                estimatedTime: 30, // Default time
                actualTime: 0,
                completed: false,
                dueDate: null, // Add to parking lot
                isHabit: false,
            });
        });
    };

    return (
        <>
            <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center"><GoalIcon /> Medium & Long-Term Goals</h2>
                <div className="flex mb-6">
                    <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="Add a new goal..." className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"/>
                    <button onClick={handleAddGoal} className="bg-teal-600 text-white py-3 px-5 rounded-r-lg hover:bg-teal-700 font-semibold transition-colors">Add</button>
                </div>
                <div className="space-y-3">
                    {goals.map(goal => (
                        <div key={goal.id} className={`flex items-center justify-between p-3 rounded-lg ${goal.completed ? 'bg-gray-100' : 'bg-white border'}`}>
                            <span className={`font-medium ${goal.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>{goal.text}</span>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => breakDownGoal(goal)} disabled={loadingBreakdown === goal.id} className="p-2 rounded-full hover:bg-teal-100 text-teal-600 disabled:text-gray-400 disabled:hover:bg-transparent" title="Break down with AI">
                                     {loadingBreakdown === goal.id ? '...' : <SparklesIcon />}
                                </button>
                                <button onClick={() => updateGoal(goal.id, {completed: !goal.completed})} className="p-2 rounded-full hover:bg-green-100 text-green-600">✓</button>
                                <button onClick={() => deleteGoal(goal.id)} className="p-2 rounded-full hover:bg-red-100 text-red-600">X</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {breakdownModal.show && <GoalBreakdownModal goalText={breakdownModal.goalText} tasks={breakdownModal.tasks} onClose={() => setBreakdownModal({show: false, goalText: '', tasks: []})} onAddTasks={addBrokenDownTasks} />}
        </>
    );
};

const WeeklyNotes = ({ currentWeek }) => {
    const { weeklySummaries, updateWeeklySummary } = useContext(DataContext);

    const weekKey = format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    // CRITICAL FIX: Only handle notes - NO macro targets at all
    const weeklyData = weeklySummaries[weekKey] || {};
    
    const handleChange = (value) => {
        // ONLY update notes - don't touch macroTargets
        const updateData = { ...weeklyData };
        delete updateData.macroTargets; // Ensure we don't interfere
        updateData.notes = value;
        updateWeeklySummary(weekKey, updateData);
    }

    return (
         <div className="p-4 sm:p-6 bg-yellow-50 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-yellow-900">Weekly Notes</h2>
             <textarea 
                value={weeklyData.notes || ''} 
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Thoughts, reflections, and important notes for the week..."
                className="w-full p-2 border border-yellow-200 bg-white/50 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 h-48"
            />
        </div>
    )
}

const UndoContext = createContext();

const UndoProvider = ({ children }) => {
    const [undoStack, setUndoStack] = useState([]);
    const [showUndoToast, setShowUndoToast] = useState(false);

    const addUndoAction = useCallback((action) => {
        setUndoStack(prev => [action, ...prev.slice(0, 4)]); // Keep last 5 actions
        setShowUndoToast(true);
        
        // Auto-hide toast after 5 seconds
        setTimeout(() => setShowUndoToast(false), 5000);
    }, []);

    const executeUndo = useCallback(() => {
        if (undoStack.length > 0) {
            const lastAction = undoStack[0];
            lastAction.undo();
            setUndoStack(prev => prev.slice(1));
            setShowUndoToast(false);
        }
    }, [undoStack]);

    const clearUndo = useCallback(() => {
        setUndoStack([]);
        setShowUndoToast(false);
    }, []);

    return (
        <UndoContext.Provider value={{ addUndoAction, executeUndo, clearUndo, hasUndo: undoStack.length > 0 }}>
            {children}
            {showUndoToast && <UndoToast onUndo={executeUndo} onDismiss={() => setShowUndoToast(false)} />}
        </UndoContext.Provider>
    );
};

// Undo Toast Component
const UndoToast = ({ onUndo, onDismiss }) => {
    return (
        <div className="fixed bottom-4 left-4 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-3">
            <span className="text-sm">Task moved</span>
            <button 
                onClick={onUndo}
                className="bg-teal-600 hover:bg-teal-700 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
                Undo
            </button>
            <button 
                onClick={onDismiss}
                className="text-gray-400 hover:text-white"
            >
                ×
            </button>
        </div>
    );
};

const CORRECT_DEFAULT_MACROS = { calories: 1583, protein: 120, carbs: 139, fat: 62 };

// Global baseline that persists across app sessions
let globalMacroBaseline = { ...CORRECT_DEFAULT_MACROS };

// Try to load from localStorage
try {
    const stored = localStorage.getItem('globalMacroBaseline');
    if (stored) {
        globalMacroBaseline = { ...CORRECT_DEFAULT_MACROS, ...JSON.parse(stored) };
    }
} catch (e) {
    // Ignore localStorage errors
}

const updateGlobalBaseline = (newTargets) => {
    globalMacroBaseline = { ...newTargets };
    try {
        localStorage.setItem('globalMacroBaseline', JSON.stringify(newTargets));
    } catch (e) {
       // Ignore localStorage errors
    }
};


const MealPlanner = ({ currentWeek }) => {
    const { weeklySummaries, updateWeeklySummary } = useContext(DataContext);
    const [isGeneratingList, setIsGeneratingList] = useState(false);
    const [isAnalyzingMacros, setIsAnalyzingMacros] = useState(false);
    const [macroAnalysis, setMacroAnalysis] = useState('');
    const [dailyMacros, setDailyMacros] = useState({});
    const [isEditingShoppingList, setIsEditingShoppingList] = useState(false);
    
    const [localWeeklyData, setLocalWeeklyData] = useState(null);
    
    // FIX: Define a static order for macros to prevent them from shifting around.
    const macroOrder = ['calories', 'protein', 'carbs', 'fat'];

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
    
    const updateTimers = React.useRef({});

    const weekKey = format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    const getPreviousWeekTargets = useCallback(() => {
        const previousWeek = subWeeks(currentWeek, 1);
        const previousWeekKey = format(startOfWeek(previousWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const previousData = weeklySummaries[previousWeekKey];
        
        if (previousData?.macroTargets) {
            const targets = { ...previousData.macroTargets };
            updateGlobalBaseline(targets);
            return targets;
        }
        
        return { ...globalMacroBaseline };
    }, [currentWeek, weeklySummaries]);

    const serverWeeklyData = React.useMemo(() => {
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
            macroTargets: stored.macroTargets || { ...globalMacroBaseline }
        };
    }, [weeklySummaries, weekKey, getPreviousWeekTargets]);

    const weeklyData = localWeeklyData || serverWeeklyData;

    React.useEffect(() => {
        setLocalWeeklyData(null);
        setDailyMacros({});
        setMacroAnalysis(serverWeeklyData.macroAnalysis || '');
        setIsEditingShoppingList(false);
    }, [weekKey, serverWeeklyData.macroAnalysis]);
    
    const weekDays = eachDayOfInterval({
        start: startOfWeek(currentWeek, {weekStartsOn:1}), 
        end: endOfWeek(currentWeek, {weekStartsOn:1})
    });
    
    const mealTypes = ['Lunch', 'Dinner', 'Snacks', 'Notes'];

    const debouncedUpdate = useCallback((updateFunction, delay = 500) => {
        if (updateTimers.current.update) {
            clearTimeout(updateTimers.current.update);
        }
        updateTimers.current.update = setTimeout(() => {
            updateFunction();
        }, delay);
    }, []);

    const updateServerState = useCallback((newData) => {
        debouncedUpdate(() => {
            updateWeeklySummary(weekKey, newData);
        });
    }, [weekKey, updateWeeklySummary, debouncedUpdate]);

    // FIX: This function now updates state for a fully controlled component.
    const handleStateChange = (field, value) => {
        const newData = { ...weeklyData, [field]: value };
        setLocalWeeklyData(newData);
        updateServerState(newData);
    };

    // FIX: A dedicated handler for nested 'meals' state.
    const handleMealChange = (day, meal, value) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const updatedMeals = {
            ...weeklyData.meals,
            [dayKey]: {
                ...(weeklyData.meals?.[dayKey] || {}),
                [meal]: value
            }
        };
        handleStateChange('meals', updatedMeals);
    };
    
    const handleMacroTargetChange = (macro, value) => {
        const updatedTargets = {
            ...(weeklyData.macroTargets || {}),
            [macro]: parseInt(value) || 0
        };
        updateGlobalBaseline(updatedTargets);
        handleStateChange('macroTargets', updatedTargets);
    };

    // FIX: This function is now much simpler because the components are controlled.
    // It just needs to update the state, and React handles the rest.
    const copyFromPreviousWeek = useCallback(async () => {
        const previousWeek = subWeeks(currentWeek, 1);
        const previousWeekKey = format(startOfWeek(previousWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const previousData = weeklySummaries[previousWeekKey];
        
        if (previousData?.meals && Object.keys(previousData.meals).length > 0) {
            const newData = {
                ...weeklyData,
                meals: JSON.parse(JSON.stringify(previousData.meals)),
                shoppingList: '',
                macroAnalysis: ''
            };
            
            // Just update the state. The controlled components will update automatically.
            setLocalWeeklyData(newData);
            
            // Save the new state to the database.
            await updateWeeklySummary(weekKey, newData);
            
            setDailyMacros({});
            setMacroAnalysis('');
            alert('Meal plan copied successfully!');
        } else {
            alert('No meal plan found for the previous week.');
        }
    }, [currentWeek, weeklySummaries, weeklyData, updateWeeklySummary, weekKey]);

    const resetMealPlan = useCallback(async () => {
        if (window.confirm('Are you sure you want to reset the entire meal plan for this week?')) {
            const resetData = {
                ...weeklyData,
                meals: {},
                foodStock: '',
                shoppingList: '',
                macroAnalysis: ''
            };
            
            setLocalWeeklyData(resetData);
            await updateWeeklySummary(weekKey, resetData);
            setDailyMacros({});
            setMacroAnalysis('');
        }
    }, [weeklyData, updateWeeklySummary, weekKey]);
    
    // NOTE: Other functions like generateOptimizedMealPlan, analyzeMacros, etc.
    // remain the same and are omitted here for brevity. Please keep them in your code.
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
            
            setLocalWeeklyData(newData);
            await updateWeeklySummary(weekKey, newData);
            setDailyMacros({});
            setMacroAnalysis('');
            
            alert('Meal plan optimized! Click "Analyze" to see macro breakdown.');
        } else {
            alert('Could not optimize meal plan. Please try again.');
        }
    } catch (error) {
        console.error('Error optimizing meal plan:', error);
        alert('Error optimizing meal plan.');
    } finally {
        setIsAnalyzingMacros(false);
    }
}, [currentWeek, weeklyData, weekDays, updateWeeklySummary, weeklySummaries]);

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
                handleStateChange('shoppingList', shoppingList);
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
                setMacroAnalysis(analysis); // Set local state for immediate display
                handleStateChange('macroAnalysis', analysis); // Persist to DB
                
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
    

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Weekly Meal Plan</h2>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={copyFromPreviousWeek} className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-50 transition-colors">
                            📋 Copy Last Week
                        </button>
                        <button onClick={resetMealPlan} className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                            🗑️ Reset Plan
                        </button>
                         <button onClick={generateOptimizedMealPlan} disabled={isAnalyzingMacros} className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50 transition-colors disabled:text-purple-400">
                            {isAnalyzingMacros ? '🤖 Optimizing...' : '🤖 Optimize Last Week'}
                        </button>
                    </div>
                </div>
                
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
                            {weekDays.map(day => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                return (
                                <tr key={dayKey} className="border-t border-gray-100">
                                    <td className="p-2 font-medium text-gray-700 text-sm align-top">{format(day, 'EEE')}</td>
                                    {mealTypes.map(mealType => (
                                        <td key={mealType} className="p-1 relative align-top">
                                            {/* FIX: Using `value` prop to make this a controlled component. No more `defaultValue` or `forceUpdate` key. */}
                                            <textarea
                                                value={weeklyData.meals?.[dayKey]?.[mealType] || ''}
                                                onChange={(e) => handleMealChange(day, mealType, e.target.value)}
                                                className="w-full p-2 border border-gray-200 bg-gray-50 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize"
                                                rows="4"
                                                placeholder={ mealType === 'Notes' ? "Prep notes, reminders..." : `Enter ${mealType.toLowerCase()}...`}
                                                style={{ minHeight: '100px' }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="xl:col-span-2 space-y-6">
                <div className="bg-green-50 rounded-2xl shadow-sm p-4">
                     <h3 className="text-lg font-bold text-green-900 mb-3">Food Stock</h3>
                    <textarea 
                        value={weeklyData.foodStock || ''} 
                        onChange={(e) => handleStateChange('foodStock', e.target.value)}
                        placeholder="Enter what you have in stock and quantities (in servings)..."
                        className="w-full p-3 border border-green-200 bg-white rounded-lg focus:ring-2 focus:ring-green-500 resize text-xs h-48"
                    />
                </div>

                <div className="bg-blue-50 rounded-2xl shadow-sm p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-blue-900">Daily Macro Targets</h3>
                        <button onClick={analyzeMacros} disabled={isAnalyzingMacros} className="text-xs text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50 transition-colors disabled:text-blue-400">
                            {isAnalyzingMacros ? '...' : '📊 Analyze'}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {/* FIX: Iterate over the static `macroOrder` array to ensure consistent order. */}
                        {macroOrder.map(macro => (
                             <div key={macro}>
                                <label className="block text-xs font-medium text-blue-700 mb-1 capitalize">{macro} {macro !== 'calories' && '(g)'}</label>
                                <input 
                                    type="number" 
                                    value={weeklyData.macroTargets?.[macro] || ''}
                                    onChange={(e) => handleMacroTargetChange(macro, e.target.value)}
                                    className="w-full p-2 border border-blue-200 bg-white rounded text-sm focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        ))}
                    </div>
                    
                    {(macroAnalysis || weeklyData.macroAnalysis) && (
                        <div className="mt-3 bg-white rounded-lg border border-blue-200">
                             <div className="p-2 border-b border-blue-100">
                                <span className="text-xs font-medium text-blue-800">Analysis Results</span>
                            </div>
                            <div className="p-3 overflow-y-auto resize-y border border-blue-100 rounded-b-lg h-32" style={{ minHeight: '128px' }}>
                                {/* FIX: Restored the custom `components` prop to fix styling. */}
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
                        </div>
                    )}
                </div>

                <div className="bg-orange-50 rounded-2xl shadow-sm p-4">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-orange-900">Shopping List</h3>
                        <div className="flex gap-2">
                            <button onClick={generateShoppingList} disabled={isGeneratingList} className="text-xs text-orange-700 hover:text-orange-900 px-2 py-1 rounded hover:bg-orange-50 transition-colors disabled:text-orange-400">
                                {isGeneratingList ? '...' : '🛒 Generate'}
                            </button>
                            <button onClick={() => setIsEditingShoppingList(!isEditingShoppingList)} className="text-xs text-orange-700 hover:text-orange-900 px-2 py-1 rounded hover:bg-orange-50 transition-colors">
                                ✏️ {isEditingShoppingList ? 'View' : 'Edit'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-orange-200 h-64">
                        {isEditingShoppingList ? (
                            <textarea 
                                value={weeklyData.shoppingList || ''}
                                onChange={(e) => handleStateChange('shoppingList', e.target.value)}
                                className="w-full h-full p-3 border-none rounded-lg focus:ring-0 resize-none text-sm"
                                placeholder="Add your shopping list items here..."
                            />
                        ) : (
                             <div className="prose prose-sm max-w-none text-xs p-3 overflow-y-auto h-full">
                                {/* FIX: Restored the custom `components` prop to fix styling. */}
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({children}) => <p className="mb-2 leading-relaxed">{children}</p>,
                                        h2: ({children}) => <h2 className="text-sm font-bold mt-3 mb-2 text-orange-800">{children}</h2>,
                                        ul: ({children}) => <ul className="ml-4 mb-2">{children}</ul>,
                                        li: ({children}) => <li className="mb-1">{children}</li>
                                    }}
                                >
                                    {weeklyData.shoppingList || "Click 'Generate' to create a shopping list..."}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AISummary = ({ timeframe, startDate, endDate }) => {
    const { tasks } = useContext(DataContext);
    const [summary, setSummary] = useState("");
    const [loading, setLoading] = useState(false);

    const generateSummary = useCallback(async () => {
        setLoading(true);
        setSummary("");

        const completedTasks = tasks.filter(task => 
            task.completed && 
            task.dueDate && 
            (isSameDay(parseISO(task.dueDate), startDate) || (isBefore(startDate, parseISO(task.dueDate)) && isBefore(parseISO(task.dueDate), endDate)))
        );
        
        if (completedTasks.length === 0) {
            setSummary("No completed tasks in this period to summarize.");
            setLoading(false);
            return;
        }

        const taskTitles = completedTasks.map(t => `- ${t.title} (Est: ${t.estimatedTime}m, Actual: ${t.actualTime}m)`).join('\n');
        const prompt = `As a productivity coach, analyze the following list of completed tasks for this ${timeframe} and write an encouraging, insightful summary of accomplishments. Highlight patterns, wins, and areas for reflection. Be brief (2-3 sentences) and motivational.\n\nCompleted Tasks:\n${taskTitles}`;

        try {
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
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
                setSummary(result.candidates[0].content.parts[0].text);
            } else {
                setSummary("Could not generate summary. Please try again.");
                console.error("AI Summary Error: Invalid response structure", result);
            }
        } catch (error) {
            console.error("AI Summary Error:", error);
            setSummary("An error occurred while generating the summary.");
        } finally {
            setLoading(false);
        }
    }, [tasks, timeframe, startDate, endDate]);

    useEffect(() => {
      const timer = setTimeout(() => generateSummary(), 500); // Debounce to prevent rapid firing
      return () => clearTimeout(timer);
    }, [generateSummary]);

    return (
        <div className="p-4 sm:p-6 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-2xl shadow-sm">
            <h3 className="text-xl font-bold mb-3 flex items-center text-teal-900"><SparklesIcon /> AI {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Summary</h3>
            <div className="min-h-[100px]">
                {loading ? (
                     <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                ) : (
                    <p className="text-teal-800 font-medium whitespace-pre-wrap text-sm">{summary}</p>
                )}
            </div>
            <button onClick={generateSummary} disabled={loading} className="mt-4 bg-teal-500 text-white py-2 px-4 rounded-lg hover:bg-teal-600 disabled:bg-teal-300 font-semibold text-sm transition-all flex items-center">
                <RepeatIcon />
                <span className="ml-2">{loading ? "Regenerating..." : "Regenerate"}</span>
            </button>
        </div>
    );
};


// Modified MonthView component with drag & drop support
// Enhanced MonthView with cleaner task display
// Enhanced MonthView with direct editing
const MonthView = ({ currentDate, setCurrentDate, setActiveView }) => {
    const { tasks, updateTask } = useContext(DataContext);
    const { addUndoAction } = useContext(UndoContext);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const weeks = eachWeekOfInterval({start: monthStart, end: monthEnd}, { weekStartsOn: 1 });

    const handleDayClick = (day, e) => {
        // Only navigate if clicking on empty space (not on a task)
        if (e.target === e.currentTarget || e.target.classList.contains('day-background')) {
            setCurrentDate(day);
            setActiveView('calendar');
        }
    };

    const DroppableDayCell = ({ day, tasksForDay, isCurrentMonth }) => {
        const [{ isOver }, drop] = useDrop(() => ({
            accept: ItemTypes.TASK,
            drop: (item) => {
                const originalDate = item.originalDueDate;
                const newDate = day;
                
                // Add undo action
                addUndoAction({
                    description: `Moved "${item.title}" to ${format(day, 'MMM d')}`,
                    undo: () => updateTask(item.id, { dueDate: originalDate ? parseISO(originalDate) : null })
                });
                
                updateTask(item.id, { dueDate: newDate });
            },
            collect: (monitor) => ({
                isOver: !!monitor.isOver(),
            }),
        }));

        return (
            <div 
                ref={drop}
                onClick={(e) => handleDayClick(day, e)}
                className={`day-background p-2 border border-gray-200 rounded-lg h-32 flex flex-col cursor-pointer transition-all duration-200 ${
                    isCurrentMonth ? 'bg-white hover:bg-teal-50' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                } ${isOver ? 'bg-teal-100 border-teal-300 shadow-inner' : ''}`}
            >
                <span className={`font-semibold mb-1 ${isToday(day) ? 'text-teal-600' : ''}`}>
                    {format(day, 'd')}
                </span>
                <div className="space-y-0.5 overflow-y-auto flex-1">
                    {tasksForDay.slice(0, 4).map(task => (
                        <Task key={task.id} task={task} compact={true} allowEdit={true} />
                    ))}
                    {tasksForDay.length > 4 && (
                        <div className="text-[9px] text-gray-500 text-center py-0.5 pointer-events-none">
                            +{tasksForDay.length - 4} more
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm">
            <AISummary timeframe="month" startDate={monthStart} endDate={monthEnd} />
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-500 mt-6 pb-2">
                {eachDayOfInterval({start: weeks[0], end: addDays(weeks[0], 6)}).map(day => 
                    <div key={day}>{format(day, 'EEE')}</div>
                )}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {weeks.map((weekStart, i) => 
                    eachDayOfInterval({start: weekStart, end: endOfWeek(weekStart, {weekStartsOn: 1})}).map(day => {
                        const tasksForDay = tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), day));
                        const isCurrentMonth = getMonth(day) === getMonth(currentDate);
                        
                        return (
                            <DroppableDayCell 
                                key={day.toString()}
                                day={day}
                                tasksForDay={tasksForDay}
                                isCurrentMonth={isCurrentMonth}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};

const YearView = ({ currentDate, setCurrentDate, setActiveView }) => {
    const year = getYear(currentDate);
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const handleMonthClick = (month) => {
        setCurrentDate(month);
        setActiveView('month');
    };

    return (
        <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm">
            <AISummary timeframe="year" startDate={yearStart} endDate={yearEnd} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                {months.map(month => (
                    <div key={getMonth(month)} onClick={() => handleMonthClick(month)} className="p-4 border border-gray-200 rounded-xl text-center cursor-pointer hover:bg-teal-50 hover:shadow-lg hover:-translate-y-1 transition-all">
                        <h3 className="font-bold text-lg text-gray-700">{format(month, 'MMMM')}</h3>
                    </div>
                ))}
            </div>
        </div>
    )
}

const BatchAddModal = ({ tasks, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
             <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Confirm Batch Add</h2>
                <p className="text-gray-600 mb-4">The following tasks will be created. Please review them.</p>
                <div className="space-y-2 max-h-80 overflow-y-auto p-2 bg-gray-50 rounded-lg border">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-4 py-2">Title</th>
                                <th className="px-4 py-2">Due Date</th>
                                <th className="px-4 py-2">Est. Time</th>
                                <th className="px-4 py-2">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task, index) => (
                                <tr key={index} className="bg-white border-b">
                                    <td className="px-4 py-2 font-medium text-gray-900">{task.title}</td>
                                    <td className="px-4 py-2">{task.dueDate}</td>
                                    <td className="px-4 py-2">{task.estimatedTime}</td>
                                    <td className="px-4 py-2 truncate max-w-xs">{task.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                    <button onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                    <button onClick={onConfirm} className="py-2 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700">Add All Tasks</button>
                </div>
             </div>
        </div>
    )
}

function App() {
    const { addTask, tasks } = useContext(DataContext);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeView, setActiveView] = useState('calendar');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createModalData, setCreateModalData] = useState(null);
    const [smartAddText, setSmartAddText] = useState("");
    const [isParsing, setIsParsing] = useState(false);
    const [batchAddModal, setBatchAddModal] = useState({ show: false, tasks: [] });

    
    const handleSmartAdd = async () => {
        if(!smartAddText) return;
        setIsParsing(true);

        // Check for Excel/TSV paste
        if (smartAddText.includes('\t') && smartAddText.includes('\n')) {
            const rows = smartAddText.trim().split('\n');
            const parsedTasks = rows.map(row => {
                const columns = row.split('\t');
                return {
                    title: columns[0] || 'Untitled',
                    dueDate: columns[1] || null,
                    estimatedTime: parseInt(columns[2], 10) || 30,
                    description: columns[3] || '',
                    isHabit: false,
                    completed: false,
                    actualTime: 0
                };
            });
            setBatchAddModal({ show: true, tasks: parsedTasks });
            setIsParsing(false);
            setSmartAddText("");
            return;
        }

        // Fallback to single-line AI parsing
        const prompt = `Parse the following text to create a task. Today's date is ${format(new Date(), 'yyyy-MM-dd')}. Extract the title, a dueDate in 'yyyy-MM-dd' format, an estimatedTime in minutes (as a number), and a description. If a detail is missing, leave its value as null. Respond with a JSON object with keys: "title", "dueDate", "estimatedTime", "description".\n\nText: "${smartAddText}"`;
        try {
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
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
                const parsedData = JSON.parse(result.candidates[0].content.parts[0].text);
                setCreateModalData(parsedData);
                setShowCreateModal(true);
                setSmartAddText("");
            } else {
                console.error("Smart Add Error", result);
                alert("Sorry, I couldn't understand that. Please try creating the task manually.");
            }
        } catch(error) {
            console.error("Smart Add Error", error);
            alert("An error occurred while parsing the task.");
        } finally {
            setIsParsing(false);
        }
    };

    const confirmBatchAdd = () => {
        batchAddModal.tasks.forEach(taskData => {
            addTask({
                ...taskData,
                dueDate: taskData.dueDate ? parseISO(taskData.dueDate) : null
            });
        });
        setBatchAddModal({ show: false, tasks: [] });
    };

    const handleExport = async () => {
        let dataToExport = [];
        let filename = 'tasks.xlsx';
        
        try {
            //const XLSX = await import('https://esm.sh/xlsx');
            // Remove the dynamic import since XLSX is now properly imported at the top

            if (activeView === 'calendar') {
                const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
                dataToExport = tasks.filter(t => t.dueDate && (isSameDay(parseISO(t.dueDate), weekStart) || (isBefore(weekStart, parseISO(t.dueDate)) && isBefore(parseISO(t.dueDate), weekEnd))));
                filename = `tasks_week_${format(weekStart, 'yyyy-MM-dd')}.xlsx`;
            } else if (activeView === 'month') {
                const monthStart = startOfMonth(currentDate);
                dataToExport = tasks.filter(t => t.dueDate && getMonth(parseISO(t.dueDate)) === getMonth(monthStart) && getYear(parseISO(t.dueDate)) === getYear(monthStart));
                filename = `tasks_month_${format(monthStart, 'yyyy-MM')}.xlsx`;
            } else if (activeView === 'year') {
                 const yearStart = startOfYear(currentDate);
                 dataToExport = tasks.filter(t => t.dueDate && getYear(parseISO(t.dueDate)) === getYear(yearStart));
                 filename = `tasks_year_${getYear(yearStart)}.xlsx`;
            } else {
                dataToExport = tasks;
            }

            const formattedData = dataToExport.map(t => ({
                Title: t.title,
                'Due Date': t.dueDate ? format(parseISO(t.dueDate), 'yyyy-MM-dd') : 'N/A',
                Completed: t.completed,
                'Est. Time (min)': t.estimatedTime,
                'Actual Time (min)': t.actualTime,
                Description: t.description,
                Type: t.isHabit ? 'Habit' : 'Task'
            }));

            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
            XLSX.writeFile(workbook, filename);
        } catch (error) {
            console.error("Failed to load or use XLSX for export:", error);
            alert("Could not export to Excel. Please try again.");
        }
    };


    const { user, loading } = useContext(AuthContext);
    
    if (loading) {
        return <div className="min-h-screen bg-sky-50 flex items-center justify-center"><p className="font-semibold text-gray-600">Loading Planner...</p></div>;
    }
    
    const ViewHeader = () => {
        const year = getYear(currentDate);
        let title = "";
        let prev, next;

        switch(activeView){
            case 'calendar':
                const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                title = `${format(weekStart, 'MMM d')} - ${format(endOfWeek(weekStart, {weekStartsOn:1}), 'MMM d, yyyy')}`;
                prev = () => setCurrentDate(subWeeks(currentDate, 1));
                next = () => setCurrentDate(addWeeks(currentDate, 1));
                break;
            case 'month':
                 title = format(currentDate, 'MMMM yyyy');
                 prev = () => setCurrentDate(subMonths(currentDate, 1));
                 next = () => setCurrentDate(addMonths(currentDate, 1));
                 break;
            case 'year':
                title = year.toString();
                prev = () => setCurrentDate(setYear(currentDate, year - 1));
                next = () => setCurrentDate(setYear(currentDate, year + 1));
                break;
            default:
                title = "Dashboard";
        }

        return (
             <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                 <div className="flex items-center space-x-4">
                    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                    {activeView !== 'taskList' && activeView !== 'goals' && (
                        <div className="flex items-center">
                             <button onClick={prev} className="p-2 rounded-full text-gray-500 hover:bg-gray-200"><ChevronLeftIcon /></button>
                             <button onClick={next} className="p-2 rounded-full text-gray-500 hover:bg-gray-200"><ChevronRightIcon /></button>
                        </div>
                    )}
                 </div>
                 <div className="flex items-center space-x-2">
                    <button onClick={handleExport} className="flex items-center bg-white text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"><DownloadIcon/> Export</button>
                    <button onClick={() => setCurrentDate(new Date())} className="bg-white text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">Today</button>
                    <button onClick={() => { setCreateModalData(null); setShowCreateModal(true); }} className="flex items-center bg-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-teal-700 transition-colors">
                        <PlusIcon /> <span className="hidden sm:inline ml-2">Create</span>
                    </button>
                 </div>
            </div>
        )
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="min-h-screen bg-sky-50 font-sans p-4 sm:p-6 lg:p-8">
                <div className="max-w-screen-2xl mx-auto">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <div>
                             <h1 className="text-2xl font-bold text-gray-800">Productivity Planner</h1>
                             <p className="text-gray-500 text-sm">Your User ID: <span className="font-mono bg-gray-200 px-1 py-0.5 rounded text-xs">{user?.uid}</span></p>
                        </div>
                         <div className="bg-white p-1 rounded-lg shadow-sm mt-4 md:mt-0">
                            <div className="flex space-x-1">
                                <button onClick={() => setActiveView('calendar')} className={`w-full text-center py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeView === 'calendar' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Week</button>
                                <button onClick={() => setActiveView('month')} className={`w-full text-center py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeView === 'month' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Month</button>
                                <button onClick={() => setActiveView('year')} className={`w-full text-center py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeView === 'year' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Year</button>
                                <button onClick={() => setActiveView('taskList')} className={`w-full text-center py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeView === 'taskList' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Tasks</button>
                                <button onClick={() => setActiveView('goals')} className={`w-full text-center py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeView === 'goals' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Goals</button>
                            </div>
                        </div>
                    </header>

                    <div className="mb-6">
                        <div className="flex rounded-lg shadow-sm">
                            <input type="text" value={smartAddText} onChange={(e) => setSmartAddText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSmartAdd()} placeholder="✨ Smart Add: Try 'Team meeting next Tuesday at 3pm for 45 mins' or paste from Excel..." className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                            <button onClick={handleSmartAdd} disabled={isParsing} className="bg-teal-500 text-white py-3 px-5 rounded-r-lg hover:bg-teal-600 font-semibold transition-colors disabled:bg-teal-300">{isParsing ? '...' : 'Add'}</button>
                        </div>
                    </div>

                    <main>
                        <ViewHeader />
                        {activeView === 'calendar' && <CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} />}
                        {activeView === 'month' && <MonthView currentDate={currentDate} setCurrentDate={setCurrentDate} setActiveView={setActiveView} />}
                        {activeView === 'year' && <YearView currentDate={currentDate} setCurrentDate={setCurrentDate} setActiveView={setActiveView} />}
                        {activeView === 'taskList' && <TaskList />}
                        {activeView === 'goals' && <GoalsView />}
                    </main>
                    
                    {showCreateModal && <CreateTaskModal onClose={() => setShowCreateModal(false)} date={currentDate} initialData={createModalData}/>}
                    {batchAddModal.show && <BatchAddModal tasks={batchAddModal.tasks} onClose={() => setBatchAddModal({show: false, tasks: []})} onConfirm={confirmBatchAdd} />}
                </div>
            </div>
        </DndProvider>
    );
}

// Update your main App return statement to include the undo
export default function WeeklyPlannerApp() {
    return (
        <DndProvider backend={HTML5Backend}>
            <AuthProvider>
                <DataProvider>
                    <UndoProvider>
                        <App />
                    </UndoProvider>
                </DataProvider>
            </AuthProvider>
        </DndProvider>
    );
}