import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { auth, createUserProfile } from 'utils/firestoreService';
import { toast } from "sonner";

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null); // For inline error display
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous inline errors

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      toast.error("Password too short", { description: "Please use at least 6 characters for your password." });
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      toast.error("Passwords don\'t match", { description: "Please re-enter your password confirmation." });
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      if (userCredential.user) {
        toast.success("Account created!", { description: "Setting up your profile..." });
        // Create user profile document in Firestore
        await createUserProfile(userCredential.user.uid, { 
          email: userCredential.user.email, 
          name: name, // Use the name from the form
          // credits: 10 // Default starting credits is handled by createUserProfile
        });
        toast.success("Profile created!", { description: "Redirecting you to the dashboard..." });
        navigate('/dashboard-page');
      } else {
        throw new Error("User creation failed, no user object returned.");
      }
    } catch (err: any) {
      console.error("Signup Error:", err);
      let friendlyMessage = "An unexpected error occurred during signup.";
      if (err.code) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            friendlyMessage = "This email address is already in use.";
            break;
          case 'auth/invalid-email':
            friendlyMessage = "The email address is not valid.";
            break;
          case 'auth/weak-password':
            friendlyMessage = "The password is too weak. Please choose a stronger password.";
            break;
          default:
            friendlyMessage = err.message || friendlyMessage;
        }
      }
      setError(friendlyMessage);
      toast.error("Signup Failed", { description: friendlyMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card/50 border-border shadow-xl">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-3xl font-bold">Create an Account</CardTitle>
          <CardDescription>Enter your details to join CreatiGen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="•••••••• (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>
            )}
            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button 
              variant="link"
              className="p-0 h-auto font-semibold text-primary hover:text-primary/80"
              onClick={() => navigate('/login-page')}
              disabled={isLoading}
            >
              Login
            </Button>
          </p>
        </CardFooter>
      </Card>
      {/* Ensure Toaster is rendered in your app, typically in App.tsx or a layout component */}
      {/* <Toaster richColors position="top-right" /> */}
    </div>
  );
};

export default SignupPage;
