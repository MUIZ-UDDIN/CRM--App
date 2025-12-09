import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  UserCircleIcon, 
  CameraIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import ImageCropper from '../components/ImageCropper';
import ImageViewer from '../components/ImageViewer';

export default function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    department: '',
    location: '',
    bio: '',
    joinDate: '',
    avatar: ''
  });

  const [tempData, setTempData] = useState(profileData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Fetch user profile data
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const profile = {
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          title: data.title || '',
          department: data.department || '',
          location: data.location || '',
          bio: data.bio || '',
          joinDate: data.created_at || '',
          avatar: data.avatar || ''
        };
        setProfileData(profile);
        setTempData(profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setTempData(profileData);
    setErrors({});
    setIsEditing(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // First Name validation
    if (!tempData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (tempData.firstName.length > 50) {
      newErrors.firstName = 'First name must be less than 50 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(tempData.firstName)) {
      newErrors.firstName = 'First name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Last Name validation
    if (!tempData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (tempData.lastName.length > 50) {
      newErrors.lastName = 'Last name must be less than 50 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(tempData.lastName)) {
      newErrors.lastName = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Email validation
    if (!tempData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tempData.email)) {
      newErrors.email = 'Please enter a valid email address (e.g., user@example.com)';
    } else if (tempData.email.length > 100) {
      newErrors.email = 'Email must be less than 100 characters';
    }

    // Phone validation
    if (tempData.phone && !/^[0-9+\-\s()]+$/.test(tempData.phone)) {
      newErrors.phone = 'Phone number can only contain digits, +, -, spaces, and parentheses';
    } else if (tempData.phone && tempData.phone.replace(/[^0-9]/g, '').length < 10) {
      newErrors.phone = 'Phone number must contain at least 10 digits';
    } else if (tempData.phone && tempData.phone.length > 20) {
      newErrors.phone = 'Phone number must be less than 20 characters';
    }

    // Title validation
    if (tempData.title && tempData.title.length > 100) {
      newErrors.title = 'Job title must be less than 100 characters';
    }

    // Department validation
    if (tempData.department && tempData.department.length > 100) {
      newErrors.department = 'Department must be less than 100 characters';
    }

    // Location validation
    if (tempData.location && tempData.location.length > 100) {
      newErrors.location = 'Location must be less than 100 characters';
    }

    // Bio validation
    if (tempData.bio && tempData.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: tempData.firstName,
          last_name: tempData.lastName,
          phone: tempData.phone,
          title: tempData.title,
          department: tempData.department,
          location: tempData.location,
          bio: tempData.bio
        })
      });
      
      if (response.ok) {
        setProfileData(tempData);
        setIsEditing(false);
        setErrors({});
        toast.success('Profile updated successfully!');
      } else {
        const error = await response.json();
        toast.error(`${error.detail || 'Failed to update profile. Please try again.'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Network error. Please check your connection and try again.');
    }
  };

  const handleCancel = () => {
    setTempData(profileData);
    setErrors({});
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTempData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - only allow JPG, JPEG, PNG
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error('Please upload only JPG, JPEG, or PNG images');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Show cropper
    setSelectedImageFile(file);
    setShowCropper(true);
    
    // Reset input
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropper(false);
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', croppedBlob, 'avatar.jpg');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(prev => ({ ...prev, avatar: data.avatar }));
        setTempData(prev => ({ ...prev, avatar: data.avatar }));
        
        // Trigger custom event to update avatar in header
        window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { avatar: data.avatar } }));
        
        toast.success('Profile picture updated successfully!');
      } else {
        const error = await response.json();
        toast.error(`${error.detail || 'Failed to upload image. Please try again.'}`);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please check your connection.');
    } finally {
      setUploadingImage(false);
      setSelectedImageFile(null);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImageFile(null);
  };

  return (
    <div className="min-h-full">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-4 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Profile</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 truncate">
                Manage your personal information and account settings
              </p>
            </div>
            <div className="flex-shrink-0">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="whitespace-nowrap">Edit Profile</span>
                </button>
              ) : (
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="whitespace-nowrap">Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="whitespace-nowrap">Save Changes</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            {/* Profile Header */}
            <div className="flex items-center space-x-6 mb-8">
              <div className="relative">
                <div 
                  className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => profileData.avatar && setShowImageViewer(true)}
                  title={profileData.avatar ? "Click to view full image" : ""}
                >
                  {profileData.avatar ? (
                    <img src={profileData.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-20 h-20 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white hover:bg-primary-700 transition-colors duration-200 cursor-pointer z-10">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <CameraIcon className="w-4 h-4" />
                </label>
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center z-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {profileData.firstName} {profileData.lastName}
                </h2>
                <p className="text-gray-600">{profileData.title || 'No title'}</p>
                <p className="text-sm text-gray-500">{profileData.department || 'No department'}</p>
              </div>
            </div>

            {/* Profile Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <div>
                        <input
                          type="text"
                          name="firstName"
                          value={tempData.firstName}
                          onChange={handleInputChange}
                          maxLength={50}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                            errors.firstName
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                          }`}
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-red-600">{errors.firstName || ''}</span>
                          <span className="text-xs text-gray-500">{tempData.firstName.length}/50</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-900">{profileData.firstName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <div>
                        <input
                          type="text"
                          name="lastName"
                          value={tempData.lastName}
                          onChange={handleInputChange}
                          maxLength={50}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                            errors.lastName
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                          }`}
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-red-600">{errors.lastName || ''}</span>
                          <span className="text-xs text-gray-500">{tempData.lastName.length}/50</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-900">{profileData.lastName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    {isEditing ? (
                      <div>
                        <input
                          type="email"
                          name="email"
                          value={tempData.email}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                        />
                        <span className="text-xs text-gray-500 mt-1 block">Email cannot be changed</span>
                      </div>
                    ) : (
                      <p className="text-gray-900">{profileData.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <div>
                        <input
                          type="tel"
                          name="phone"
                          value={tempData.phone}
                          onChange={handleInputChange}
                          maxLength={20}
                          placeholder="+1 (555) 123-4567"
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                            errors.phone
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                          }`}
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-red-600">{errors.phone || ''}</span>
                          <span className="text-xs text-gray-500">{tempData.phone.length}/20</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-900">{profileData.phone || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Work Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title
                    </label>
                    {isEditing ? (
                      <div>
                        <input
                          type="text"
                          name="title"
                          value={tempData.title}
                          onChange={handleInputChange}
                          maxLength={100}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                            errors.title
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                          }`}
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-red-600">{errors.title || ''}</span>
                          <span className="text-xs text-gray-500">{tempData.title.length}/100</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-900">{profileData.title || 'Not provided'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    {isEditing ? (
                      <div>
                        <input
                          type="text"
                          name="department"
                          value={tempData.department}
                          onChange={handleInputChange}
                          maxLength={100}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                            errors.department
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                          }`}
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-red-600">{errors.department || ''}</span>
                          <span className="text-xs text-gray-500">{tempData.department.length}/100</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-900">{profileData.department || 'Not provided'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    {isEditing ? (
                      <div>
                        <input
                          type="text"
                          name="location"
                          value={tempData.location}
                          onChange={handleInputChange}
                          maxLength={100}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                            errors.location
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                          }`}
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-red-600">{errors.location || ''}</span>
                          <span className="text-xs text-gray-500">{tempData.location.length}/100</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-900">{profileData.location || 'Not provided'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Join Date
                    </label>
                    <p className="text-gray-900">
                      {profileData.joinDate ? new Date(profileData.joinDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Not available'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">About</h3>
              {isEditing ? (
                <div>
                  <textarea
                    name="bio"
                    value={tempData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    maxLength={500}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                      errors.bio
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                    }`}
                    placeholder="Tell us about yourself..."
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-red-600">{errors.bio || ''}</span>
                    <span className="text-xs text-gray-500">{tempData.bio.length}/500</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 leading-relaxed">{profileData.bio || 'No bio provided'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && selectedImageFile && (
        <ImageCropper
          imageFile={selectedImageFile}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && profileData.avatar && (
        <ImageViewer
          imageUrl={profileData.avatar}
          onClose={() => setShowImageViewer(false)}
          userName={`${profileData.firstName} ${profileData.lastName}`}
        />
      )}
    </div>
  );
}
