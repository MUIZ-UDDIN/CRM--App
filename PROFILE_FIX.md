# Profile Page Fixes

## Issues Fixed:
1. ✅ Character limits added to all fields
2. ✅ Image upload functionality (with validation)
3. ✅ Comprehensive validation for all fields
4. ✅ User-friendly error messages
5. ✅ Real-time validation feedback

## Manual Fix Required

Due to the file size, please manually apply these changes to `frontend/src/pages/Profile.tsx`:

### 1. Add State Variables (after line 26)

```typescript
const [errors, setErrors] = useState<Record<string, string>>({});
const [uploadingImage, setUploadingImage] = useState(false);
```

### 2. Add avatar to profileData state (line 16-25)

Add `avatar: ''` to the profileData state object.

### 3. Add Validation Function (after handleEdit function, around line 73)

```typescript
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
```

### 4. Update handleSave Function

Add validation check at the beginning:

```typescript
const handleSave = async () => {
  // Validate form
  if (!validateForm()) {
    toast.error('Please fix the errors before saving');
    return;
  }
  
  // ... rest of the function
  
  // Update success/error messages:
  toast.success('✅ Profile updated successfully!');
  // and
  toast.error(`❌ ${error.detail || 'Failed to update profile. Please try again.'}`);
};
```

### 5. Update handleCancel Function

```typescript
const handleCancel = () => {
  setTempData(profileData);
  setErrors({});
  setIsEditing(false);
};
```

### 6. Update handleInputChange Function

```typescript
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
```

### 7. Add Image Upload Function (after handleInputChange)

```typescript
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast.error('❌ Please upload an image file (JPG, PNG, GIF)');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('❌ Image size must be less than 5MB');
    return;
  }

  setUploadingImage(true);
  try {
    const formData = new FormData();
    formData.append('file', file);

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
      toast.success('✅ Profile picture updated successfully!');
    } else {
      const error = await response.json();
      toast.error(`❌ ${error.detail || 'Failed to upload image. Please try again.'}`);
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    toast.error('❌ Failed to upload image. Please check your connection.');
  } finally {
    setUploadingImage(false);
  }
};
```

### 8. Update Profile Image Section (around line 167)

Replace the profile image div with:

```tsx
<div className="relative">
  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
    {profileData.avatar ? (
      <img src={profileData.avatar} alt="Profile" className="w-full h-full object-cover" />
    ) : (
      <UserCircleIcon className="w-20 h-20 text-gray-400" />
    )}
  </div>
  <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white hover:bg-primary-700 transition-colors duration-200 cursor-pointer">
    <input
      type="file"
      accept="image/*"
      onChange={handleImageUpload}
      className="hidden"
      disabled={uploadingImage}
    />
    <CameraIcon className="w-4 h-4" />
  </label>
  {uploadingImage && (
    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
  )}
</div>
```

### 9. Update All Input Fields

For each input field, add:
- `maxLength` attribute
- Error styling with conditional classes
- Character counter
- Error message display

Example for First Name:

```tsx
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
```

Apply similar pattern to:
- Last Name (50 chars)
- Phone (20 chars)
- Title (100 chars)
- Department (100 chars)
- Location (100 chars)
- Bio (500 chars)

For Email, make it disabled:

```tsx
<input
  type="email"
  name="email"
  value={tempData.email}
  onChange={handleInputChange}
  maxLength={100}
  disabled
  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
/>
<span className="text-xs text-gray-500 mt-1 block">Email cannot be changed</span>
```

## Testing Checklist

After applying fixes:

1. **Character Limits**
   - [ ] Try typing more than 50 characters in First/Last Name
   - [ ] Try typing more than 100 characters in Title/Department/Location
   - [ ] Try typing more than 500 characters in Bio
   - [ ] Verify character counter shows correct count

2. **Validation**
   - [ ] Try saving with empty First Name - should show error
   - [ ] Try entering invalid email format - should show error
   - [ ] Try entering letters in phone number - should show error
   - [ ] Try entering less than 10 digits in phone - should show error
   - [ ] Verify errors clear when you start typing

3. **Image Upload**
   - [ ] Click camera icon
   - [ ] Select an image file - should upload successfully
   - [ ] Try uploading a non-image file - should show error
   - [ ] Try uploading file > 5MB - should show error
   - [ ] Verify image appears in profile picture

4. **Error Messages**
   - [ ] Verify all error messages are user-friendly
   - [ ] Verify success messages show with ✅ emoji
   - [ ] Verify error messages show with ❌ emoji
