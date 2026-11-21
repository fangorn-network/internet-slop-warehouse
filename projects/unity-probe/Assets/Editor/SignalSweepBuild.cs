using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class SignalSweepBuild
{
    private const string ScenePath = "Assets/SignalSweep.unity";

    [MenuItem("Warehouse/Generate Signal Sweep Scene")]
    public static void GenerateScene()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        new GameObject("Signal Sweep").AddComponent<SignalSweep>();
        if (!EditorSceneManager.SaveScene(scene, ScenePath))
            throw new BuildFailedException("Could not save the Signal Sweep scene.");
    }

    [MenuItem("Warehouse/Build Signal Sweep for Web")]
    public static void BuildWeb()
    {
        GenerateScene();
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = new[] { ScenePath },
            locationPathName = "Builds/SignalSweep",
            target = BuildTarget.WebGL,
            options = BuildOptions.None
        });
        if (report.summary.result != BuildResult.Succeeded)
            throw new BuildFailedException($"Signal Sweep Web build ended with {report.summary.result}.");
    }
}
