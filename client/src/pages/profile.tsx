import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, DollarSign, Heart, Camera, Save, Edit, Shield, Plus, Trash2, Building, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { z } from "zod";
import type { User as UserType } from "@shared/schema";

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  // Personal identification
  nationalId: z.string().optional(),
  citizenshipNumber: z.string().optional(),
  passportNumber: z.string().optional(),
  maternalName: z.string().optional(),
  paternalName: z.string().optional(),
  grandfatherName: z.string().optional(),
  nationality: z.string().optional(),
  // Professional details
  department: z.string().optional(),
  position: z.string().optional(),
  profilePicture: z.string().optional(),
  portfolio: z.string().optional(),
  skills: z.array(z.object({
    name: z.string().min(1, "Skill name is required"),
    level: z.string().optional(),
    category: z.string().optional(),
  })).optional(),
  qualifications: z.array(z.object({
    title: z.string().min(1, "Qualification title is required"),
    institution: z.string().optional(),
    year: z.string().optional(),
    description: z.string().optional(),
    grade: z.string().optional(),
    field: z.string().optional(),
  })).optional(),
  trainings: z.array(z.object({
    title: z.string().min(1, "Training title is required"),
    provider: z.string().optional(),
    completedDate: z.string().optional(),
    certificateUrl: z.string().optional(),
    description: z.string().optional(),
    duration: z.string().optional(),
  })).optional(),
  experiences: z.array(z.object({
    title: z.string().min(1, "Job title is required"),
    company: z.string().min(1, "Company name is required"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
    current: z.boolean().optional(),
    responsibilities: z.string().optional(),
  })).optional(),
  emergencyContacts: z.array(z.object({
    name: z.string().min(1, "Contact name is required"),
    phone: z.string().min(1, "Phone number is required"),
    relationship: z.string().min(1, "Relationship is required"),
    address: z.string().optional(),
    isAlternate: z.boolean().optional(),
  })).optional(),
  bankDetailsArray: z.array(z.object({
    bankName: z.string().min(1, "Bank name is required"),
    accountNumber: z.string().min(1, "Account number is required"),
    routingNumber: z.string().optional(),
    accountType: z.string().optional(),
    isPrimary: z.boolean().optional(),
    swiftCode: z.string().optional(),
  })).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery<UserType>({
    queryKey: ['/api/profile', user?.id],
    enabled: !!user?.id,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: profile?.fullName || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      dateOfBirth: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : "",
      // Personal identification
      nationalId: profile?.nationalId || "",
      citizenshipNumber: profile?.citizenshipNumber || "",
      passportNumber: profile?.passportNumber || "",
      maternalName: profile?.maternalName || "",
      paternalName: profile?.paternalName || "",
      grandfatherName: profile?.grandfatherName || "",
      nationality: profile?.nationality || "",
      // Professional details
      department: profile?.department || "",
      position: profile?.position || "",
      profilePicture: profile?.profilePicture || "",
      portfolio: profile?.portfolio || "",
      skills: Array.isArray(profile?.skills) ? profile.skills : [],
      qualifications: Array.isArray(profile?.qualifications) ? profile.qualifications : [],
      trainings: Array.isArray(profile?.trainings) ? profile.trainings : [],
      experiences: Array.isArray(profile?.experiences) ? profile.experiences : [],
      emergencyContacts: Array.isArray(profile?.emergencyContacts) ? profile.emergencyContacts : [],
      bankDetailsArray: Array.isArray(profile?.bankDetailsArray) ? profile.bankDetailsArray : [],
    },
  });

  const {
    fields: qualificationFields,
    append: appendQualification,
    remove: removeQualification
  } = useFieldArray({
    control: form.control,
    name: "qualifications"
  });

  const {
    fields: trainingFields,
    append: appendTraining,
    remove: removeTraining
  } = useFieldArray({
    control: form.control,
    name: "trainings"
  });

  const {
    fields: skillFields,
    append: appendSkill,
    remove: removeSkill
  } = useFieldArray({
    control: form.control,
    name: "skills"
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience
  } = useFieldArray({
    control: form.control,
    name: "experiences"
  });

  const {
    fields: emergencyContactFields,
    append: appendEmergencyContact,
    remove: removeEmergencyContact
  } = useFieldArray({
    control: form.control,
    name: "emergencyContacts"
  });

  const {
    fields: bankDetailsFields,
    append: appendBankDetails,
    remove: removeBankDetails
  } = useFieldArray({
    control: form.control,
    name: "bankDetailsArray"
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest('PUT', `/api/profile/${user?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="h-64 bg-muted rounded-lg"></div>
            </div>
            <div className="lg:col-span-2">
              <div className="h-64 bg-muted rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "professional", label: "Professional", icon: Briefcase },
    { id: "experience", label: "Experience", icon: Building },
    { id: "qualifications", label: "Qualifications", icon: GraduationCap },
    { id: "emergency", label: "Emergency Contact", icon: Heart },
    { id: "banking", label: "Banking Details", icon: CreditCard },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold charcoal-text">Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal and professional information
          </p>
        </div>
        
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
          className={isEditing ? "" : "primary-bg hover:bg-primary-600"}
        >
          {isEditing ? (
            <>
              <Save className="mr-2 h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile Summary Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.profilePicture} />
                  <AvatarFallback className="text-xl">
                    {profile?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    variant="outline"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <CardTitle>{profile?.fullName}</CardTitle>
            <CardDescription>
              <Badge variant="secondary" className="mb-2">
                <Shield className="h-3 w-3 mr-1" />
                {profile?.role}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profile?.email}</span>
            </div>
            {profile?.phone && (
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile?.department && (
              <div className="flex items-center space-x-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{profile.department}</span>
              </div>
            )}
            {profile?.position && (
              <div className="text-sm text-muted-foreground">
                {profile.position}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Profile Content */}
        <div className="lg:col-span-3">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information Tab */}
              {activeTab === "personal" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Basic personal details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 (555) 123-4567" {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="123 Main St, City, State 12345" 
                              {...field} 
                              disabled={!isEditing}
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="portfolio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://yourportfolio.com" 
                              {...field} 
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Professional Information Tab */}
              {activeTab === "professional" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Professional Information</CardTitle>
                    <CardDescription>
                      Work-related details and skills
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <FormControl>
                              <Input placeholder="Engineering" {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Position</FormLabel>
                            <FormControl>
                              <Input placeholder="Software Engineer" {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <FormLabel>Skills</FormLabel>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profile?.skills?.map((skill, index) => (
                          <Badge key={index} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                        {(!profile?.skills || profile.skills.length === 0) && (
                          <p className="text-sm text-muted-foreground">No skills added yet</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Qualifications Tab */}
              {activeTab === "qualifications" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Qualifications & Training</CardTitle>
                    <CardDescription>
                      Educational background and professional certifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <FormLabel>Qualifications</FormLabel>
                        {isEditing && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendQualification({ title: "", institution: "", year: "" })}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Qualification
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {qualificationFields.map((field, index) => (
                          <div key={field.id} className="p-3 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Qualification {index + 1}</h4>
                              {isEditing && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeQualification(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <FormField
                                control={form.control}
                                name={`qualifications.${index}.title`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Bachelor's Degree" {...field} disabled={!isEditing} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`qualifications.${index}.institution`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Institution</FormLabel>
                                    <FormControl>
                                      <Input placeholder="University Name" {...field} disabled={!isEditing} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`qualifications.${index}.year`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Year</FormLabel>
                                    <FormControl>
                                      <Input placeholder="2020" {...field} disabled={!isEditing} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        ))}
                        {qualificationFields.length === 0 && (
                          <p className="text-sm text-muted-foreground">No qualifications added yet</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <FormLabel>Training & Certifications</FormLabel>
                        {isEditing && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendTraining({ title: "", provider: "", completedDate: "", certificateUrl: "" })}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Training
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {trainingFields.map((field, index) => (
                          <div key={field.id} className="p-3 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Training {index + 1}</h4>
                              {isEditing && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTraining(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name={`trainings.${index}.title`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                      <Input placeholder="AWS Certification" {...field} disabled={!isEditing} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`trainings.${index}.provider`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Provider</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Amazon Web Services" {...field} disabled={!isEditing} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`trainings.${index}.completedDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Completion Date</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} disabled={!isEditing} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`trainings.${index}.certificateUrl`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Certificate URL</FormLabel>
                                    <FormControl>
                                      <Input placeholder="https://..." {...field} disabled={!isEditing} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        ))}
                        {trainingFields.length === 0 && (
                          <p className="text-sm text-muted-foreground">No training records found</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Experience Tab */}
              {activeTab === "experience" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Work Experience</CardTitle>
                        <CardDescription>
                          Your professional work history and experience
                        </CardDescription>
                      </div>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendExperience({ 
                            title: "", 
                            company: "", 
                            startDate: "",
                            endDate: "",
                            description: "",
                            current: false,
                            responsibilities: ""
                          })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Experience
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-6">
                      {experienceFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Experience {index + 1}</h4>
                            {isEditing && experienceFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExperience(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`experiences.${index}.title`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Job Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Software Engineer" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`experiences.${index}.company`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Company</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Tech Corp" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`experiences.${index}.startDate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`experiences.${index}.endDate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>End Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name={`experiences.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Brief description of your role and achievements" 
                                    {...field} 
                                    disabled={!isEditing}
                                    rows={3}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`experiences.${index}.responsibilities`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Key Responsibilities</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="List your key responsibilities and accomplishments" 
                                    {...field} 
                                    disabled={!isEditing}
                                    rows={3}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                      {experienceFields.length === 0 && isEditing && (
                        <p className="text-sm text-muted-foreground">No work experience added. Click "Add Experience" to add one.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Emergency Contact Tab */}
              {activeTab === "emergency" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Emergency Contacts</CardTitle>
                        <CardDescription>
                          Contact information for emergencies
                        </CardDescription>
                      </div>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendEmergencyContact({ 
                            name: "", 
                            phone: "", 
                            relationship: "", 
                            address: "",
                            isAlternate: false 
                          })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Contact
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {emergencyContactFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Contact {index + 1}</h4>
                            {isEditing && emergencyContactFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEmergencyContact(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`emergencyContacts.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contact Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Jane Doe" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`emergencyContacts.${index}.phone`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="+1 (555) 987-6543" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`emergencyContacts.${index}.relationship`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Relationship</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Spouse, Parent, Sibling, etc." {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`emergencyContacts.${index}.address`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Address (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="123 Main St" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                      {emergencyContactFields.length === 0 && isEditing && (
                        <p className="text-sm text-muted-foreground">No emergency contacts added. Click "Add Contact" to add one.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Banking Details Tab */}
              {activeTab === "banking" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Banking Details</CardTitle>
                        <CardDescription>
                          Banking information for payroll processing
                        </CardDescription>
                      </div>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendBankDetails({ 
                            bankName: "", 
                            accountNumber: "", 
                            routingNumber: "",
                            accountType: "",
                            isPrimary: false,
                            swiftCode: ""
                          })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Bank Account
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {bankDetailsFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Bank Account {index + 1}</h4>
                            {isEditing && bankDetailsFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBankDetails(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`bankDetailsArray.${index}.bankName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Bank Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Bank of America" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`bankDetailsArray.${index}.accountNumber`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account Number</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="****1234" 
                                      type="password"
                                      {...field} 
                                      disabled={!isEditing} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`bankDetailsArray.${index}.routingNumber`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Routing Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="123456789" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`bankDetailsArray.${index}.accountType`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select account type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="checking">Checking</SelectItem>
                                      <SelectItem value="savings">Savings</SelectItem>
                                      <SelectItem value="business">Business</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`bankDetailsArray.${index}.swiftCode`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>SWIFT Code (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="BOAFUS3N" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                      {bankDetailsFields.length === 0 && isEditing && (
                        <p className="text-sm text-muted-foreground">No bank accounts added. Click "Add Bank Account" to add one.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {isEditing && (
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="primary-bg hover:bg-primary-600"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}