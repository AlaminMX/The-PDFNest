import { Link } from "react-router-dom";

const NotFound = () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 px-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="text-primary underline hover:text-primary/80 text-sm">Go home</Link>
      </div>
    </div>
);

export default NotFound;
