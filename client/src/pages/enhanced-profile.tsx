import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, DollarSign, Heart, Camera, Save, Edit, Shield, Plus, Trash2, Building, CreditCard, Globe, Users, Award, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
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

export default function EnhancedProfile() {
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
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      nationalId: "",
      citizenshipNumber: "",
      passportNumber: "",
      maternalName: "",
      paternalName: "",
      grandfatherName: "",
      nationality: "",
      department: "",
      position: "",
      profilePicture: "",
      portfolio: "",
      skills: [],
      qualifications: [],
      trainings: [],
      experiences: [],
      emergencyContacts: [],
      bankDetailsArray: [],
    },
    values: profile ? {
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      address: profile.address || "",
      dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : "",
      nationalId: profile.nationalId || "",
      citizenshipNumber: profile.citizenshipNumber || "",
      passportNumber: profile.passportNumber || "",
      maternalName: profile.maternalName || "",
      paternalName: profile.paternalName || "",
      grandfatherName: profile.grandfatherName || "",
      nationality: profile.nationality || "",
      department: profile.department || "",
      position: profile.position || "",
      profilePicture: profile.profilePicture || "",
      portfolio: profile.portfolio || "",
      skills: (profile.skills as any) || [],
      qualifications: (profile.qualifications as any) || [],
      trainings: (profile.trainings as any) || [],
      experiences: (profile.experiences as any) || [],
      emergencyContacts: (profile.emergencyContacts as any) || [],
      bankDetailsArray: (profile.bankDetailsArray as any) || [],
    } : undefined,
  });

  // Field arrays for dynamic sections
  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({
    control: form.control,
    name: "skills",
  });

  const { fields: qualificationFields, append: appendQualification, remove: removeQualification } = useFieldArray({
    control: form.control,
    name: "qualifications",
  });

  const { fields: trainingFields, append: appendTraining, remove: removeTraining } = useFieldArray({
    control: form.control,
    name: "trainings",
  });

  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
    control: form.control,
    name: "experiences",
  });

  const { fields: emergencyContactFields, append: appendEmergencyContact, remove: removeEmergencyContact } = useFieldArray({
    control: form.control,
    name: "emergencyContacts",
  });

  const { fields: bankDetailFields, append: appendBankDetail, remove: removeBankDetail } = useFieldArray({
    control: form.control,
    name: "bankDetailsArray",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest("PUT", `/api/profile/${user?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/profile', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Profile</h1>
            <p className="text-gray-600 dark:text-gray-300">Comprehensive employee information and portfolio</p>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={updateProfileMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={updateProfileMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Profile Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.profilePicture || ""} />
                <AvatarFallback className="text-2xl">
                  {profile?.fullName?.split(' ').map(n => n[0]).join('') || 'UN'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile?.fullName || 'No Name Set'}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {profile?.position || 'No Position Set'} • {profile?.department || 'No Department'}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>{profile?.email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center space-x-1">
                      <Phone className="h-4 w-4" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Tabs */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="qualifications">Education</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="emergency">Emergency</TabsTrigger>
                <TabsTrigger value="banking">Banking</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Personal Information</span>
                    </CardTitle>
                    <CardDescription>Basic personal details and identification</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter full name" {...field} disabled={!isEditing} />
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
                              <Input type="email" placeholder="email@example.com" {...field} disabled={!isEditing} />
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

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Family Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="maternalName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mother's Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Mother's full name" {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="paternalName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Father's Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Father's full name" {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="grandfatherName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Grandfather's Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Grandfather's full name" {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Identification Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="nationalId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>National ID Number</FormLabel>
                              <FormControl>
                                <Input placeholder="National identification number" {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="citizenshipNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Citizenship Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Citizenship certificate number" {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="passportNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Passport Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Passport number" {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="nationality"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nationality</FormLabel>
                              <FormControl>
                                <Input placeholder="Country of citizenship" {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Full address including city, state, and postal code" 
                              {...field} 
                              disabled={!isEditing}
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Qualifications Tab */}
              <TabsContent value="qualifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <GraduationCap className="h-5 w-5" />
                          <span>Education & Qualifications</span>
                        </CardTitle>
                        <CardDescription>Academic qualifications and certifications</CardDescription>
                      </div>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => appendQualification({ title: "", institution: "", year: "", description: "", grade: "", field: "" })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Qualification
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {qualificationFields.length === 0 && !isEditing && (
                      <p className="text-gray-500 text-center py-8">No qualifications added yet</p>
                    )}
                    {qualificationFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-lg space-y-4">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`qualifications.${index}.title`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Qualification Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Bachelor of Science" {...field} disabled={!isEditing} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`qualifications.${index}.field`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Field of Study</FormLabel>
                                <FormControl>
                                  <Input placeholder="Computer Science" {...field} disabled={!isEditing} />
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
                                  <Input placeholder="University name" {...field} disabled={!isEditing} />
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
                                <FormLabel>Year of Completion</FormLabel>
                                <FormControl>
                                  <Input placeholder="2020" {...field} disabled={!isEditing} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`qualifications.${index}.grade`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Grade/GPA</FormLabel>
                                <FormControl>
                                  <Input placeholder="3.8/4.0 or First Class" {...field} disabled={!isEditing} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`qualifications.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Additional details about the qualification"
                                  {...field} 
                                  disabled={!isEditing}
                                  rows={2}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}

                    <Separator className="my-6" />

                    {/* Trainings Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">Training & Certifications</h3>
                          <p className="text-sm text-gray-600">Professional training and certifications</p>
                        </div>
                        {isEditing && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => appendTraining({ title: "", provider: "", completedDate: "", certificateUrl: "", description: "", duration: "" })}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Training
                          </Button>
                        )}
                      </div>

                      {trainingFields.length === 0 && !isEditing && (
                        <p className="text-gray-500 text-center py-4">No training records added yet</p>
                      )}
                      {trainingFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-4 mb-4">
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`trainings.${index}.title`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Training Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="AWS Cloud Practitioner" {...field} disabled={!isEditing} />
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
                                  <FormLabel>Training Provider</FormLabel>
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
                              name={`trainings.${index}.duration`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duration</FormLabel>
                                  <FormControl>
                                    <Input placeholder="40 hours" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`trainings.${index}.certificateUrl`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel>Certificate URL</FormLabel>
                                  <FormControl>
                                    <Input placeholder="https://certificate-url.com" {...field} disabled={!isEditing} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name={`trainings.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Details about the training content and skills gained"
                                    {...field} 
                                    disabled={!isEditing}
                                    rows={2}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Experience Tab */}
              <TabsContent value="experience" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <Briefcase className="h-5 w-5" />
                          <span>Work Experience</span>
                        </CardTitle>
                        <CardDescription>Professional work history and experience</CardDescription>
                      </div>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => appendExperience({ title: "", company: "", startDate: "", endDate: "", description: "", current: false, responsibilities: "" })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Experience
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {experienceFields.length === 0 && !isEditing && (
                      <p className="text-gray-500 text-center py-8">No work experience added yet</p>
                    )}
                    {experienceFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Experience {index + 1}</h4>
                          {isEditing && (
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
                                  <Input placeholder="Senior Software Engineer" {...field} disabled={!isEditing} />
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
                                  <Input placeholder="Tech Corp Inc." {...field} disabled={!isEditing} />
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
                          name={`experiences.${index}.current`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!isEditing}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Current Position</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Check if this is your current job
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`experiences.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Brief description of the role and achievements"
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
                                  placeholder="List key responsibilities and achievements in this role"
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
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <Award className="h-5 w-5" />
                          <span>Skills & Expertise</span>
                        </CardTitle>
                        <CardDescription>Technical and professional skills</CardDescription>
                      </div>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => appendSkill({ name: "", level: "", category: "" })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Skill
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {skillFields.length === 0 && !isEditing && (
                      <p className="text-gray-500 text-center py-8">No skills added yet</p>
                    )}
                    {skillFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Skill {index + 1}</h4>
                          {isEditing && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSkill(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`skills.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Skill Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="JavaScript" {...field} disabled={!isEditing} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`skills.${index}.level`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Proficiency Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="beginner">Beginner</SelectItem>
                                    <SelectItem value="intermediate">Intermediate</SelectItem>
                                    <SelectItem value="advanced">Advanced</SelectItem>
                                    <SelectItem value="expert">Expert</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`skills.${index}.category`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="technical">Technical</SelectItem>
                                    <SelectItem value="leadership">Leadership</SelectItem>
                                    <SelectItem value="communication">Communication</SelectItem>
                                    <SelectItem value="design">Design</SelectItem>
                                    <SelectItem value="management">Management</SelectItem>
                                    <SelectItem value="analytical">Analytical</SelectItem>
                                    <SelectItem value="creative">Creative</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Emergency Contacts Tab */}
              <TabsContent value="emergency" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <Heart className="h-5 w-5" />
                          <span>Emergency Contacts</span>
                        </CardTitle>
                        <CardDescription>Emergency contact information for critical situations</CardDescription>
                      </div>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => appendEmergencyContact({ name: "", phone: "", relationship: "", address: "", isAlternate: false })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Contact
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {emergencyContactFields.length === 0 && !isEditing && (
                      <p className="text-gray-500 text-center py-8">No emergency contacts added yet</p>
                    )}
                    {emergencyContactFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Contact {index + 1}</h4>
                          {isEditing && (
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
                                  <Input placeholder="John Doe" {...field} disabled={!isEditing} />
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
                                  <Input placeholder="+1 (555) 123-4567" {...field} disabled={!isEditing} />
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
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select relationship" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="spouse">Spouse</SelectItem>
                                    <SelectItem value="parent">Parent</SelectItem>
                                    <SelectItem value="sibling">Sibling</SelectItem>
                                    <SelectItem value="child">Child</SelectItem>
                                    <SelectItem value="friend">Friend</SelectItem>
                                    <SelectItem value="relative">Relative</SelectItem>
                                    <SelectItem value="guardian">Guardian</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`emergencyContacts.${index}.address`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Contact's address"
                                  {...field} 
                                  disabled={!isEditing}
                                  rows={2}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`emergencyContacts.${index}.isAlternate`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!isEditing}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Alternate Contact</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Mark as alternate/secondary contact
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Banking Tab */}
              <TabsContent value="banking" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <CreditCard className="h-5 w-5" />
                          <span>Banking Information</span>
                        </CardTitle>
                        <CardDescription>Bank account details for payroll and financial transactions</CardDescription>
                      </div>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => appendBankDetail({ bankName: "", accountNumber: "", routingNumber: "", accountType: "", isPrimary: false, swiftCode: "" })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Bank Account
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {bankDetailFields.length === 0 && !isEditing && (
                      <p className="text-gray-500 text-center py-8">No bank accounts added yet</p>
                    )}
                    {bankDetailFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Bank Account {index + 1}</h4>
                          {isEditing && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBankDetail(index)}
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
                                  <Input placeholder="Chase Bank" {...field} disabled={!isEditing} />
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
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
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
                            name={`bankDetailsArray.${index}.accountNumber`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Account Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="123456789" type="password" {...field} disabled={!isEditing} />
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
                                  <Input placeholder="021000021" {...field} disabled={!isEditing} />
                                </FormControl>
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
                                  <Input placeholder="CHASUS33" {...field} disabled={!isEditing} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`bankDetailsArray.${index}.isPrimary`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!isEditing}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Primary Account</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Use this account for primary payroll deposits
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
}