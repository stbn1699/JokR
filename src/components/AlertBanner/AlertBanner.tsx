import type {ReactNode} from "react";
import "./AlertBanner.css";

type AlertBannerProps = {
    tone?: "success" | "error";
    children: ReactNode;
};

export function AlertBanner({tone = "success", children}: AlertBannerProps) {
    return <div className={`alert-banner ${tone}`}>{children}</div>;
}
