'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Menu } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { db, collection, addDoc, getDocs, doc, setDoc, deleteDoc } from '../firebase' // Import Firestore functions

const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT']
const months = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface Tag {
  id: string
  name: string
  color: string
}

interface Task {
  id: string
  name: string
  date: string
  time: string
  description: string
  tags: Tag[]
  completed: boolean
}

export default function CalendarComponent() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState<Omit<Task, 'id' | 'completed'>>({
    name: '',
    date: '',
    time: '',
    description: '',
    tags: []
  })
  const [newTag, setNewTag] = useState<Omit<Tag, 'id'>>({ name: '', color: '#808080' })
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [taskFilter, setTaskFilter] = useState('all')

  useEffect(() => {
    const tags = tasks.flatMap(task => task.tags)
    const uniqueTags = Array.from(new Set(tags.map(tag => JSON.stringify(tag))))
      .map(str => {
        try {
          return JSON.parse(str) as Tag
        } catch (error) {
          console.error("Error parsing tag:", str, error)
          return null
        }
      })
      .filter((tag): tag is Tag => tag !== null)
    setAllTags(uniqueTags)
  }, [tasks])

  useEffect(() => {
    // Fetch tasks from Firestore when component mounts
    const fetchTasks = async () => {
      const tasksCollection = collection(db, 'tasks')
      const taskSnapshot = await getDocs(tasksCollection)
      const taskList = taskSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[]
      setTasks(taskList)
    }

    fetchTasks()
  }, [])

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (selectedTask) {
      setSelectedTask({ ...selectedTask, [name]: value })
    } else {
      setNewTask(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleTagSelect = (tagName: string) => {
    const selectedTag = allTags.find(tag => tag.name === tagName);
    if (selectedTag) {
      if (selectedTask) {
        setSelectedTask(prev => ({
          ...prev!,
          tags: [...prev!.tags, selectedTag]
        }));
      } else {
        setNewTask(prev => ({
          ...prev,
          tags: [...prev.tags, selectedTag]
        }));
      }
    }
  };

  const handleNewTagInput = async () => {
    const trimmedTagName = newTag.name.trim()
    if (trimmedTagName && !allTags.some(tag => tag.name.toLowerCase() === trimmedTagName.toLowerCase())) {
      try {
        const tagsCollection = collection(db, 'tags')
        const newTagRef = await addDoc(tagsCollection, {
          name: trimmedTagName,
          color: newTag.color
        })
        
        const newTagObject = { id: newTagRef.id, name: trimmedTagName, color: newTag.color }
        setAllTags(prev => [...prev, newTagObject])
        
        if (selectedTask) {
          setSelectedTask(prev => {
            if (prev) {
              return {
                ...prev,
                tags: [...prev.tags, newTagObject]
              }
            }
            return null
          })
        } else {
          setNewTask(prev => ({
            ...prev,
            tags: [...prev.tags, newTagObject]
          }))
        }
        
        setNewTag({ name: '', color: '#808080' })
      } catch (error) {
        console.error("Error adding new tag: ", error)
      }
    }
  }

  const removeTag = (tagToRemove: string) => {
    const updateTags = (prevTags: Tag[]) => prevTags.filter(tag => tag.name !== tagToRemove)

    if (selectedTask) {
      setSelectedTask(prev => {
        if (prev) {
          return {
            ...prev,
            tags: updateTags(prev.tags)
          }
        }
        return null
      })
    } else {
      setNewTask(prev => ({
        ...prev,
        tags: updateTags(prev.tags)
      }))
    }
  }

  const addOrUpdateTask = async () => {
    if (selectedTask) {
      // Update existing task in Firestore
      try {
        const taskRef = doc(db, 'tasks', selectedTask.id);
        await setDoc(taskRef, {
          name: selectedTask.name,
          date: selectedTask.date,
          time: selectedTask.time,
          description: selectedTask.description,
          tags: selectedTask.tags.map(tag => ({ id: tag.id, name: tag.name, color: tag.color })),
          completed: selectedTask.completed
        }, { merge: true });

        // Update the task in local state
        setTasks(prev => prev.map(task => 
          task.id === selectedTask.id ? selectedTask : task
        ));

        console.log("Task updated successfully");
      } catch (error) {
        console.error("Error updating task: ", error);
      }
    } else if (newTask.name && newTask.date) {
      const taskDate = new Date(newTask.date)
      taskDate.setMinutes(taskDate.getMinutes() - taskDate.getTimezoneOffset())
      const formattedDate = taskDate.toISOString().split('T')[0]
      
      try {
        const tasksCollection = collection(db, 'tasks')
        const newTaskRef = await addDoc(tasksCollection, {
          name: newTask.name,
          date: formattedDate,
          time: newTask.time,
          description: newTask.description,
          tags: newTask.tags.map(tag => ({ id: tag.id, name: tag.name, color: tag.color })),
          completed: false
        })
        
        const addedTask = {
          id: newTaskRef.id,
          ...newTask,
          date: formattedDate,
          completed: false
        }
        setTasks(prev => [...prev, addedTask])
        
        console.log("Task added with ID: ", newTaskRef.id)
      } catch (error) {
        console.error("Error adding task: ", error)
      }
    }
    closeModal()
  }

  const deleteTask = async () => {
    if (selectedTask) {
      try {
        // Delete the task from Firestore
        await deleteDoc(doc(db, 'tasks', selectedTask.id));
        
        // Remove the task from local state
        setTasks(prev => prev.filter(task => task.id !== selectedTask.id));
        
        console.log("Task deleted successfully");
        closeModal();
      } catch (error) {
        console.error("Error deleting task: ", error);
      }
    }
  };

  const openTaskModal = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const openNewTaskModal = () => {
    const today = new Date()
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
    setSelectedTask(null)
    setNewTask({
      name: '',
      date: today.toISOString().split('T')[0],
      time: '',
      description: '',
      tags: []
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
    setNewTask({
      name: '',
      date: '',
      time: '',
      description: '',
      tags: []
    })
  }

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ))
  }

  const filteredTasks = tasks.filter(task => {
    const taskDate = new Date(task.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    switch (taskFilter) {
      case 'day':
        return taskDate.toDateString() === today.toDateString()
      case 'week':
        return taskDate >= weekStart && taskDate < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      case 'month':
        return taskDate.getMonth() === monthStart.getMonth() && taskDate.getFullYear() === monthStart.getFullYear()
      default:
        return true
    }
  })

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev)
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 font-['Space_Mono']">
      <div className={`flex-1 p-4 overflow-auto transition-all duration-300 ${isSidebarOpen ? 'md:mr-64' : ''}`}>
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-2 md:space-y-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            {months[currentDate.getMonth()]}, {currentDate.getFullYear()}
          </h1>
          <div className="flex items-center space-x-2">
            <Button onClick={prevMonth} size="icon" variant="outline">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button onClick={nextMonth} size="icon" variant="outline">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={openNewTaskModal} variant="outline" className="whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              Add task
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {daysOfWeek.map(day => (
            <div key={day} className="text-center font-semibold p-2 bg-white text-xs md:text-sm text-gray-600">{day}</div>
          ))}
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="p-2 bg-white"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), index + 1)
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
            const dateString = date.toISOString().split('T')[0]
            const dayTasks = tasks.filter(task => task.date === dateString)
            const isToday = date.toDateString() === new Date().toDateString()
            
            return (
              <div key={index} className={`border-t border-l p-1 md:p-2 bg-white min-h-[80px] md:min-h-[120px] ${isToday ? 'bg-blue-50' : ''}`}>
                <div className={`font-semibold ${isToday ? 'text-blue-600' : 'text-gray-600'} mb-1 text-xs md:text-sm`}>{index + 1}</div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 2).map(task => (
                    <div
                      key={task.id}
                      className="text-[10px] md:text-xs p-1 rounded bg-white border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50"
                      onClick={() => openTaskModal(task)}
                    >
                      <div className={`font-semibold truncate ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.name}</div>
                      <div className="text-gray-500 hidden md:block">{task.time}</div>
                      <div className="flex flex-wrap gap-1 mt-1 hidden md:flex">
                        {task.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag.id}
                            className="text-white px-1 py-0.5 rounded text-[8px] md:text-[10px]"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-[10px] md:text-xs text-gray-500">+{dayTasks.length - 2} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className={`fixed inset-y-0 right-0 z-20 w-64 bg-white border-l border-gray-200 transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0 ${isSidebarOpen ? 'md:w-64' : 'md:w-12'}`}>
        <Button
          variant="ghost"
          
          size="sm"
          onClick={toggleSidebar}
          className="absolute top-4 -left-10 md:left-2 p-2 bg-white border border-gray-200 rounded-l md:rounded"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <Menu className="h-6 w-6" />
        </Button>
        {isSidebarOpen && (
          <>
            <div className="p-4 pt-16">
              <h2 className="text-lg font-semibold mb-4">Tasks</h2>
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="h-[calc(100vh-120px)] px-4">
              <div className="space-y-2">
                {filteredTasks.map(task => (
                  <div key={task.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={() => toggleTaskCompletion(task.id)}
                    />
                    <label
                      htmlFor={`task-${task.id}`}
                      className={`text-sm ${task.completed ? 'line-through text-gray-400' : ''}`}
                    >
                      {task.name}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-[425px] font-['Space_Mono']">
          <DialogHeader>
            <DialogTitle>{selectedTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={selectedTask ? selectedTask.name : newTask.name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={selectedTask ? selectedTask.date : newTask.date}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time
              </Label>
              <Input
                id="time"
                name="time"
                type="time"
                value={selectedTask ? selectedTask.time : newTask.time}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={selectedTask ? selectedTask.description : newTask.description}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tags" className="text-right">
                Tags
              </Label>
              <div className="col-span-3 space-y-2">
                <Select onValueChange={handleTagSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTags.map(tag => (
                      <SelectItem key={tag.id} value={tag.name}>
                        <div className="flex items-center">
                          <span className="text-white text-xs px-2 py-0.5 rounded mr-2" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Input
                    id="tagName"
                    placeholder="Add new tag"
                    value={newTag.name}
                    onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-grow"
                  />
                  <Input
                    type="color"
                    value={newTag.color}
                    onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-10 p-1 rounded"
                  />
                  <Button onClick={handleNewTagInput} size="sm">
                    Create Tag
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selectedTask ? selectedTask.tags : newTask.tags).map(tag => (
                    <span
                      key={tag.id}
                      className="text-white text-xs font-semibold px-2 py-0.5 rounded flex items-center"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                      <button
                        onClick={() => removeTag(tag.name)}
                        className="ml-1 text-white hover:text-gray-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <Button onClick={addOrUpdateTask}>{selectedTask ? 'Update Task' : 'Add Task'}</Button>
            {selectedTask && (
              <Button onClick={deleteTask} variant="destructive">Delete Task</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
