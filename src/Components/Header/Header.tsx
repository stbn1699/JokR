import "./Header.scss"
import {FaUser} from "react-icons/fa";

export default function Header() {
    return (
        <div className="header">
            <img src="/JokR_Logo_Full.svg" alt="logo" onClick={() => window.location.href = "/"}/>
            <div className="usersection">
                <FaUser onClick={() => window.location.href = "/login"}/>
            </div>
        </div>
    )
}